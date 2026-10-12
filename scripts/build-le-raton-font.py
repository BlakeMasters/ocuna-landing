"""Build Le Raton's installable TTF and compressed webfont from saved outlines.

Requires fontTools (tested with 4.56.0). No downloads or source-image access.
The site build consumes the generated fonts; it does not require Python.
"""
from pathlib import Path
import hashlib
import json
import unicodedata
from fontTools.agl import UV2AGL
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.ttLib import TTFont

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"scripts"/"font-source"/"le-raton"/"glyphs.json"
OUTPUT=ROOT/"site-public"/"fonts"
VERSION="1.160"

SYMBOLS={
    ".":"period",",":"comma",":":"colon",";":"semicolon","'":"quotesingle",
    '"':"quotedbl","-":"hyphen","_":"underscore","(":"parenleft",
    ")":"parenright","[":"bracketleft","]":"bracketright","{":"braceleft",
    "}":"braceright","/":"slash","\\":"backslash","?":"question","!":"exclam",
    "+":"plus","=":"equal","<":"less",">":"greater","*":"asterisk",
    "#":"numbersign","$":"dollar","%":"percent","&":"ampersand","@":"at",
    "|":"bar","~":"asciitilde","^":"asciicircum","`":"grave",
    "–":"endash","—":"emdash","‘":"quoteleft","’":"quoteright",
    "“":"quotedblleft","”":"quotedblright","·":"middot","×":"multiply",
    "←":"arrowleft","↗":"arrowne",
}
MARKS={"\u0300":"grave","\u0301":"acute","\u0302":"circumflex",
       "\u0303":"tilde","\u0308":"dieresis","\u030a":"ring",
       "\u0327":"cedilla","\u0328":"ogonek"}

def glyph_name(char):
    return UV2AGL.get(ord(char),"uni%04X"%ord(char))

def normalize_winding(points):
    # Extraction already preserves opposite winding for counters. Reversing
    # every contour converts image coordinates to TrueType's outer direction.
    clean=[]
    for point in reversed(points):
        if not clean or point!=clean[-1]:clean.append(point)
    if len(clean)>1 and clean[0]==clean[-1]:clean.pop()
    if len(set(map(tuple,clean)))<3:return []
    area=sum(x*y2-x2*y for (x,y),(x2,y2) in zip(clean,clean[1:]+clean[:1]))
    return clean if area else []

def build():
    definition=json.loads(SOURCE.read_text(encoding="utf-8"))
    spacing_path=SOURCE.parent/"spacing.json"
    spacing=json.loads(spacing_path.read_text(encoding="utf-8"))
    assert spacing["version"]==VERSION
    outlines=definition["glyphs"]
    glyphs={};metrics={};cmap={};provenance={}

    def add(name,record):
        pen=TTGlyphPen(None)
        for raw in record["contours"]:
            points=normalize_winding(raw)
            if not points:continue
            pen.moveTo(tuple(points[0]))
            for point in points[1:]:pen.lineTo(tuple(point))
            pen.closePath()
        glyphs[name]=pen.glyph()
        minx=min((x for pts in record["contours"] for x,y in pts),default=0)
        metrics[name]=(record["advance"],minx)
        provenance[name]=record.get("provenance",{})

    add(".notdef",{"advance":530,"contours":[[[30,0],[30,720],[480,720],[480,0]],[[75,50],[425,50],[425,670],[75,670]]]})
    add("space",{"advance":spacing["wordSpace"]["advance"],"contours":[]})
    cmap[32]="space";cmap[160]="space"
    for char in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789":
        name=glyph_name(char);add(name,outlines[char]);cmap[ord(char)]=name
    for char,key in SYMBOLS.items():
        name=glyph_name(char)
        if name not in glyphs:add(name,outlines[key])
        cmap[ord(char)]=name
    for key in ("Le","Raton"):
        add(key+".liga",outlines[key])
    # Western European accents use the new font's own pen marks and base forms.
    for code in range(0xC0,0x180):
        char=chr(code);decomposition=unicodedata.normalize("NFD",char)
        if len(decomposition)!=2:continue
        base,mark=decomposition
        if ord(base) not in cmap or mark not in MARKS:continue
        base_record=outlines.get(base)
        if not base_record:continue
        accent=outlines[MARKS[mark]]
        top=max(y for pts in base_record["contours"] for x,y in pts)
        shift_y=top-425 if mark not in ("\u0327","\u0328") else 0
        accent_x=(base_record["advance"]-accent["advance"])/2
        contours=base_record["contours"]+[[[round(x+accent_x),round(y+shift_y)] for x,y in pts] for pts in accent["contours"]]
        name=glyph_name(char)
        add(name,{"advance":base_record["advance"],"contours":contours,
            "provenance":{"method":"composed","from":[base,MARKS[mark]]}})
        cmap[code]=name
    # Common editorial characters outside decomposable Latin-1.
    for char,base in [("ø","o"),("Ø","O"),("ł","l"),("Ł","L")]:
        record=outlines[base];stroke=outlines["slash"]
        contours=record["contours"]+[[[round(x*.7),round(y*.65)] for x,y in pts] for pts in stroke["contours"]]
        name=glyph_name(char);add(name,{"advance":record["advance"],"contours":contours,"provenance":{"method":"composed","from":[base,"slash"]}});cmap[ord(char)]=name
    for char,first,second in [("æ","a","e"),("Æ","A","E"),("œ","o","e"),("Œ","O","E")]:
        one,two=outlines[first],outlines[second];offset=one["advance"]-90
        record={"advance":offset+two["advance"],"contours":one["contours"]+[[[x+offset,y] for x,y in pts] for pts in two["contours"]],"provenance":{"method":"composed","from":[first,second]}}
        name=glyph_name(char);add(name,record);cmap[ord(char)]=name
    ellipsis=outlines["period"]
    add("ellipsis",{"advance":600,"contours":[[[x+offset,y] for x,y in pts] for offset in (0,190,380) for pts in ellipsis["contours"]],"provenance":{"method":"composed","from":["period"]}});cmap[0x2026]="ellipsis"

    builder=FontBuilder(1000,isTTF=True)
    builder.setupGlyphOrder(list(glyphs))
    builder.setupCharacterMap(cmap)
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics(metrics)
    builder.setupHorizontalHeader(ascent=1100,descent=-500,lineGap=0)
    builder.setupNameTable({
        "familyName":"Le Raton","styleName":"Regular","uniqueFontIdentifier":f"Ocuna:LeRaton-Regular:{VERSION}",
        "fullName":"Le Raton Regular","psName":"LeRaton-Regular","version":f"Version {VERSION}",
        "copyright":"Le Raton digitization and matching letterforms, Ocuna, 2026. Historical annotation references: Bibliothèque nationale de France, via Wikimedia Commons, public domain.",
        "description":"A digital interpretation of small marginal handwriting on eighteen Jacques de Sève drawings dated 1755–1759, beginning with Le Raton (1756). Forty alphabetic forms and all ten digits are directly traced. Remaining letters and symbols are interpreted. Similarity of the annotation hand is a visual assessment; its writer and date are unconfirmed. No outlines from existing fonts are used.",
        "manufacturer":"Ocuna","designer":"Ocuna",
    })
    ymax=max((y for r in glyphs.values() for x,y in (r.coordinates or [])),default=1100)
    ymin=min((y for r in glyphs.values() for x,y in (r.coordinates or [])),default=-500)
    builder.setupOS2(version=4,sTypoAscender=1100,sTypoDescender=-500,sTypoLineGap=0,
        usWinAscent=max(1100,ymax),usWinDescent=max(500,-ymin),sxHeight=440,sCapHeight=830,
        usWeightClass=400,usWidthClass=5,fsSelection=0xC0,fsType=0)
    builder.setupPost(italicAngle=-14)
    builder.setupMaxp()
    # Fixed timestamps make repeated builds byte-identical.
    builder.font["head"].created=3874521600
    builder.font["head"].modified=3874521600
    builder.font.recalcTimestamp=False
    features="""languagesystem DFLT dflt;
languagesystem latn dflt;
feature liga {
  sub L e by Le.liga;
  sub R a t o n by Raton.liga;
} liga;
"""
    pairs=spacing["sourcePairs"]+spacing["retainedOpticalPairs"]
    capital_spacing=spacing.get("capitalPairSpacing",{})
    for group in capital_spacing.get("groups",[]):
        pairs+=[{"pair":group["capital"]+second,"adjustment":amount}
                for second,amount in group["adjustments"].items()]
    assert len({record["pair"] for record in pairs})==len(pairs)
    features+="feature kern {\n"
    for record in pairs:
        first,second=record["pair"]
        features+=f"  pos {glyph_name(first)} {glyph_name(second)} {record['adjustment']};\n"
    features+="} kern;"
    addOpenTypeFeaturesFromString(builder.font,features)
    OUTPUT.mkdir(parents=True,exist_ok=True)
    ttf=OUTPUT/"LeRaton-Regular.ttf"
    builder.save(ttf)
    web=TTFont(ttf,recalcTimestamp=False)
    web.flavor="woff"
    woff=OUTPUT/"LeRaton-Regular.woff"
    web.save(woff)
    alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    direct=lambda c: outlines[c]["provenance"]["method"]=="traced"
    report={"family":"Le Raton","version":VERSION,"unitsPerEm":1000,
        "glyphs":len(glyphs),"mappedCharacters":len(cmap),"features":["liga","kern"],
        "spacing":{"reference":"spacing.json","sha256":hashlib.sha256(spacing_path.read_bytes()).hexdigest(),
            "spaceAdvance":spacing["wordSpace"]["advance"],
            "translatedForms":list(spacing["glyphMetrics"]),
            "sourceInformedPairs":[record["pair"] for record in spacing["sourcePairs"]],
            "retainedOpticalPairs":[record["pair"] for record in spacing["retainedOpticalPairs"]],
            "capitalPairSpacing":{"capitals":[group["capital"] for group in capital_spacing.get("groups",[])],
                "pairs":sum(len(group["adjustments"]) for group in capital_spacing.get("groups",[])),
                "evidence":"Digital optical correction; not historical pair measurements."}},
        "sourceCoverage":{"directlyTracedLetters":[c for c in alphabet if direct(c)],
            "directlyTracedDigits":[c for c in "0123456789" if direct(c)],
            "interpretedLetters":[c for c in alphabet if not direct(c)]},
        "glyphProvenance":provenance,"files":[{"file":path.name,"bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()} for path in (ttf,woff)]}
    (SOURCE.parent/"build-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print("Built Le Raton:",len(glyphs),"glyphs,",len(cmap),"characters.")
    for path in (ttf,woff):print(path.relative_to(ROOT),path.stat().st_size,"bytes")

if __name__=="__main__":build()
