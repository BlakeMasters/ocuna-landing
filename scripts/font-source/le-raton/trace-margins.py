"""One-time outline extraction for the font's inspected marginal handwriting."""
from pathlib import Path
import argparse
import hashlib
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
DEST = ROOT
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("scan_directory", type=Path, help="Folder containing raton.jpg, renard.jpg, and fouine.jpg from sources.json")
parser.add_argument("--additional-scan-directory", type=Path, help="Folder containing the additional scan variants listed in sources.json")
args = parser.parse_args()
SCANS_DIRECTORY = args.scan_directory
SCANS = {
    "raton": (SCANS_DIRECTORY / "raton.jpg", (60, 3130)),
    "renard": (SCANS_DIRECTORY / "renard.jpg", (100, 3100)),
    "fouine": (SCANS_DIRECTORY / "fouine.jpg", (40, 3150)),
}
ADDITIONAL = json.loads((ROOT / "additional-samples.json").read_text(encoding="utf-8"))["samples"]
SOURCE_RECORDS = json.loads((ROOT / "sources.json").read_text(encoding="utf-8"))["sources"]
if args.additional_scan_directory:
    for record in SOURCE_RECORDS:
        if record["id"] not in SCANS:
            SCANS[record["id"]] = (args.additional_scan_directory / record["localFilenameForExtraction"], (0, 0))
# Coordinates are measured in the inspected annotation crops, not the artwork.
# Connected entry/exit strokes are retained; individual characters use modest spacing.
SAMPLES = {
    "L": ("raton", [34, 18, 89, 114], 110, 10.8),
    "R": ("raton", [158, 22, 217, 113], 110, 10.4),
    "a": ("raton", [207, 68, 250, 115], 111, 10.5),
    "t": ("raton", [245, 53, 289, 114], 110, 10.5),
    "o": ("fouine", [170, 68, 207, 109], 103, 12.0),
    "n": ("raton", [304, 71, 346, 113], 109, 11.4),
    "m": ("raton", [489, 67, 550, 108], 104, 11.5),
    "p": ("raton", [720, 56, 767, 155], 98, 10.5),
    "T": ("renard", [477, 77, 538, 135], 132, 14.0),
    "r": ("renard", [296, 103, 331, 147], 143, 11.4),
    "d": ("renard", [330, 60, 383, 147], 144, 10.0),
    "e": ("fouine", [302, 68, 341, 104], 101, 13.5),
    "f": ("fouine", [130, 17, 184, 158], 103, 10.2),
    "u": ("fouine", [208, 66, 250, 107], 103, 12.0),
    "i": ("fouine", [251, 46, 283, 106], 103, 13.0),
    "V": ("raton", [602, 53, 641, 99], 96, 17.0),
    "I": ("raton", [650, 53, 671, 99], 96, 17.0),
    "0": ("renard", [802, 92, 832, 132], 129, 18.5),
    "1": ("fouine", [738, 48, 755, 91], 86, 18.0),
    "3": ("raton", [827, 40, 854, 102], 98, 12.3),
    "5": ("raton", [862, 38, 897, 103], 98, 12.1),
    "6": ("raton", [897, 21, 952, 100], 96, 10.0),
    "8": ("fouine", [764, 30, 799, 96], 92, 11.8),
    "period": ("raton", [356, 82, 377, 101], 101, 8.0),
    "Le": ("raton", [33, 18, 124, 114], 110, 10.5),
    "Raton": ("raton", [158, 22, 348, 115], 110, 10.4),
}

def trace(key, sample):
    is_additional = isinstance(sample, dict)
    if is_additional:
        source, box, baseline, scale = (sample[k] for k in ("source", "crop", "baseline", "scale"))
    else:
        source, box, baseline, scale = sample
    path, offset = SCANS[source]
    image = Image.open(path).convert("RGB")
    absolute = [box[0]+offset[0], box[1]+offset[1], box[2]+offset[0], box[3]+offset[1]]
    crop = np.array(image.crop(absolute))
    gray = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    # Paper fibers and faded scan noise are excluded, not transferred into glyphs.
    mask = (gray < 132).astype(np.uint8)*255
    if key == "i" and not is_additional:
        # Retain the right-leaning dot, remove the adjacent n below it.
        mask[20:,18:] = 0
    if key == "T" and not is_additional:
        mask[26:,39:] = 0  # Period after the abbreviation is a separate glyph.
    if key == "V" and not is_additional:
        mask[18:,33:] = 0  # Exclude the adjacent Roman numeral I.
    if is_additional:
        for polygon in sample.get("remove", []):
            cv2.fillPoly(mask, [np.array(polygon, dtype=np.int32)], 0)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((2,2), np.uint8))
    if is_additional:
        # Detached pieces of adjoining letters are not part of the specimen.
        # F has a genuinely detached upper stroke; preserve both of its parts.
        count, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
        components = sorted(range(1, count), key=lambda n: stats[n, cv2.CC_STAT_AREA], reverse=True)
        keep = components[:sample.get("keepComponents", 1)]
        mask = np.where(np.isin(labels, keep), 255, 0).astype(np.uint8)
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    outlines = []
    for index, contour in enumerate(contours):
        area = cv2.contourArea(contour)
        parent = hierarchy[0][index][3]
        if area < (2 if parent >= 0 else 9):
            continue
        simplified = cv2.approxPolyDP(contour, 0.48, True).reshape(-1,2)
        points=[]
        for x,y in simplified:
            px = float(x)*scale+28
            py = float(baseline-box[1]-y)*scale
            if py < 0:
                py *= 0.64  # Long reference descenders fit a usable digital line.
            points.append([round(px), round(py)])
        if len(points) >= 3:
            outlines.append(points)
    advance = round((box[2]-box[0])*scale + 50)
    target = sample.get("targetWidth") if is_additional else {"0":430,"1":230,"3":310,"5":380,"6":470,"8":390}.get(key)
    if target:
        ratio = target / ((box[2]-box[0])*scale)
        outlines = [[[round((x-28)*ratio+28),y] for x,y in points] for points in outlines]
        advance = target+60
    if is_additional:
        # Space from the body of a letter, allowing a long flourish to overhang
        # neighbouring letters above or below their bodies. Shape is unchanged.
        shift = sample.get("xShift", 0)
        if shift: outlines = [[[x+shift,y] for x,y in points] for points in outlines]
        advance = sample.get("advance", advance)
    provenance = {
        "method":"traced", "source":source, "crop":absolute,
        "threshold":132, "baseline":baseline+offset[1], "scale":scale,
        "notes":"Ink contours cleaned and normalized; long descenders shortened for digital typesetting."
    }
    if is_additional:
        provenance["retainedInkComponents"] = sample.get("keepComponents", 1)
        provenance["selection"] = "Small marginal annotation visually compared with Le Raton; writer and annotation date unconfirmed."
        if sample.get("remove"): provenance["neighborInkRemoved"] = sample["remove"]
        if target: provenance["targetWidth"] = target
        if "advance" in sample or "xShift" in sample:
            provenance["spacing"] = {"xShift":sample.get("xShift",0), "advance":advance,
                                      "notes":"Body spacing; original flourish overhang retained."}
    return {"advance": advance, "contours": outlines, "provenance": provenance}

if __name__ == "__main__":
    for source in SOURCE_RECORDS:
        if source["id"] not in SCANS: continue
        path = SCANS[source["id"]][0]
        if hashlib.sha256(path.read_bytes()).hexdigest() != source["sha256"]:
            raise ValueError(f"Source scan differs from the inspected original: {path}")
    DEST.mkdir(parents=True, exist_ok=True)
    glyphs = {key: trace(key,sample) for key,sample in SAMPLES.items()}
    if args.additional_scan_directory:
        glyphs.update({key: trace(key, sample) for key, sample in ADDITIONAL.items()})
    elif (DEST / "traced-glyphs.json").exists():
        # Re-extracting the initial three scans must preserve later attested forms.
        prior = json.loads((DEST / "traced-glyphs.json").read_text(encoding="utf-8"))["glyphs"]
        glyphs.update({key: record for key, record in prior.items() if key in ADDITIONAL})
    (DEST / "traced-glyphs.json").write_text(json.dumps({"unitsPerEm":1000,"glyphs":glyphs},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    proof=Image.new("RGB",(1200,800),"#eee5d3")
    draw=ImageDraw.Draw(proof)
    for index,(key,glyph) in enumerate(glyphs.items()):
        ox=(index%8)*150+10; oy=(index//8)*200+130
        draw.text((ox,oy-115),key,fill="black")
        draw.line((ox,oy,ox+140,oy),fill="#baaa8a")
        for points in glyph["contours"]:
            pts=[(ox+x*.11,oy-y*.11) for x,y in points]
            # This inspection image is approximate; the final font retains counters.
            draw.polygon(pts,fill="#382e25")
    proof.save(SCANS_DIRECTORY/"traced-glyphs-proof.png")
    print("Saved",len(glyphs),"traced glyphs and ligatures.")
