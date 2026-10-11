"""Draw matching missing forms; this does not borrow outlines from another font."""
from pathlib import Path
import json
import math
import cv2
import numpy as np
from fontTools.pens.recordingPen import RecordingPen
from fontTools.svgLib.path import parse_path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT

# Upright centerlines; the same slant, nib contrast and rounded ink endings apply
# to all newly drawn letters. Coordinates are font units, with y increasing up.
DRAWINGS = {
 "b": ["M55 15 C100 215 135 520 182 775 C225 860 122 747 95 628 C80 460 80 195 75 85 C135 380 235 520 305 398 C360 272 250 35 128 32 C83 25 73 48 105 108"],
 "c": ["M338 380 C250 492 106 401 59 233 C12 61 90 -20 221 23 C283 42 312 69 335 98"],
 "g": ["M325 412 C245 478 110 392 69 228 C28 64 99 12 179 67 C259 118 316 303 323 432 L242 -150 C220 -338 92 -423 30 -324 C-11 -254 108 -188 260 -130"],
 "h": ["M56 5 C94 216 140 571 181 782 C220 855 111 755 89 613 C82 433 88 217 54 11 M60 51 C150 255 229 476 301 410 C340 365 293 184 272 70 C260 5 294 24 355 63"],
 "j": ["M176 421 L98 -158 C80 -328 -30 -387 -65 -312 C-89 -252 -8 -209 101 -175", "M198 641 L211 659"],
 "k": ["M54 11 C89 164 94 341 135 533 C160 650 199 761 222 829", "M88 196 C147 295 251 444 288 408 C328 366 231 290 131 226", "M142 225 C200 208 183 60 249 27 C282 11 315 47 344 81"],
 "l": ["M42 45 C128 278 218 610 205 755 C196 863 115 773 99 662 C79 411 82 171 45 62 C36 9 80 15 142 65"],
 "q": ["M298 405 C251 434 141 345 90 243 C41 145 49 45 104 55 C177 64 270 236 298 405 Z", "M307 408 C294 320 281 213 265 103 C245 -41 211 -222 216 -335 C217 -380 249 -345 280 -314"],
 "s": ["M275 402 C216 479 118 450 102 364 C92 304 221 240 208 125 C192 11 80 -30 28 47 C1 89 50 135 110 124"],
 "x": ["M40 398 C102 472 116 382 151 258 C187 134 188 18 271 43 C311 55 332 91 344 117", "M325 437 C242 335 112 89 26 16"],
 "y": ["M91 420 C74 284 27 42 109 45 C196 51 276 308 305 434 L218 -169 C194 -343 62 -405 18 -317 C-15 -247 86 -186 241 -144"],
 "z": ["M39 366 C131 449 234 430 303 389 L57 44 C132 62 217 72 282 30 C334 -19 252 -140 163 -128 C99 -115 164 -33 302 12"],
 "A": ["M12 24 C115 239 260 541 355 803 C371 850 391 830 386 776 L374 73 C376 22 428 44 469 79", "M100 254 C190 283 309 303 410 293"],
 "B": ["M48 12 L125 806 M63 678 C125 846 401 847 450 732 C495 614 347 437 133 442 M119 443 C352 545 467 391 394 215 C350 102 183 -14 58 16"],
 "C": ["M525 740 C409 903 179 796 84 535 C-14 282 28 30 187 26 C287 13 399 70 457 148"],
 "D": ["M56 12 L137 806 M55 701 C222 868 449 837 474 637 C511 382 318 41 151 19 C67 6 34 44 61 93"],
 "E": ["M441 747 C313 896 143 782 125 622 C105 449 282 438 338 502 M321 482 C217 423 76 474 29 263 C-15 66 122 -37 294 31 C348 52 388 95 411 122"],
 "F": ["M57 12 L143 798 M75 702 C198 817 384 866 487 785 M104 451 C199 474 302 476 356 501"],
 "G": ["M519 737 C408 903 190 799 86 538 C-9 285 32 33 183 27 C286 17 394 98 432 209 L454 431 C404 412 348 399 307 415"],
 "H": ["M41 19 L126 812 M376 17 L463 815 M76 418 C216 420 343 459 441 469"],
 "J": ["M280 801 L169 108 C139 -125 47 -263 -35 -177 C-69 -111 2 -45 127 -8 M174 796 C229 809 321 819 363 801"],
 "K": ["M53 15 L139 812 M495 823 C360 640 213 494 105 358 M190 435 C273 430 299 142 375 43 C400 17 443 46 478 74"],
 "M": ["M32 21 L124 810 C136 869 158 798 170 746 L199 167 L469 804 C503 872 496 778 488 719 L403 51 C398 7 443 27 483 62"],
 "N": ["M39 11 L137 820 C156 872 172 736 189 652 L281 65 C295 -8 313 115 333 234 L424 816"],
 "O": ["M425 756 C306 892 134 751 70 505 C-5 241 37 44 152 20 C289 -8 429 191 463 427 C488 584 487 724 425 756"],
 "P": ["M52 9 L135 802 M54 674 C161 869 414 871 451 725 C499 532 281 366 111 425"],
 "Q": ["M425 756 C306 892 134 751 70 505 C-5 241 37 44 152 20 C289 -8 429 191 463 427 C488 584 487 724 425 756", "M219 111 C279 -28 331 -148 441 -104 C498 -84 519 -53 533 -30"],
 "S": ["M437 756 C373 889 198 829 147 692 C80 512 330 393 304 211 C274 38 103 -36 24 79 C-17 144 70 223 142 207"],
 "U": ["M76 807 C58 579 2 39 151 24 C326 20 401 608 447 815 L349 48 C351 1 397 26 433 61"],
 "W": ["M60 804 L105 45 C112 -8 156 126 189 226 L390 807 L371 51 C374 -7 420 123 455 237 L653 820"],
 "X": ["M78 796 C193 855 194 667 221 485 C247 292 251 54 352 34 C398 33 439 78 458 122", "M479 829 C318 594 150 238 16 16"],
 "Y": ["M40 800 C104 807 109 633 147 514 C183 384 240 381 299 485 L461 825 M299 484 L218 5"],
 "Z": ["M83 747 C232 845 385 830 485 780 L39 19 C167 80 356 59 447 30"],
 "2": ["M28 614 C90 801 302 827 351 704 C401 555 179 366 42 143 L10 43 C88 57 270 61 353 33"],
 "4": ["M364 762 L11 211 C104 190 299 225 417 239 M321 786 L241 5"],
 "7": ["M19 723 C122 768 253 793 364 751 L163 263 C106 130 121 41 156 18"],
 "comma": ["M100 26 C109 -36 54 -114 17 -149"],
 "quotesingle": ["M122 760 L91 626"],
 "quotedbl": ["M85 760 L55 625", "M232 760 L202 625"],
 "hyphen": ["M40 255 L285 270"],
 "endash": ["M40 255 L545 270"],
 "emdash": ["M40 255 L800 270"],
 "underscore": ["M14 -140 L520 -140"],
 "parenleft": ["M226 823 C98 664 6 200 74 -123"],
 "parenright": ["M70 823 C211 700 241 195 89 -123"],
 "bracketleft": ["M221 805 L98 805 L42 -90 L184 -90"],
 "bracketright": ["M47 805 L187 805 L119 -90 L-1 -90"],
 "braceleft": ["M265 805 C93 863 178 533 65 398 C170 233 21 -49 189 -101"],
 "braceright": ["M47 805 C219 863 134 533 247 398 C142 233 291 -49 123 -101"],
 "slash": ["M17 -85 L355 850"],
 "backslash": ["M75 850 L369 -85"],
 "question": ["M28 579 C128 761 298 758 337 622 C380 467 162 376 145 219"],
 "exclam": ["M116 788 L53 222"],
 "plus": ["M195 557 L160 80", "M-15 299 L380 312"],
 "equal": ["M17 422 L386 432", "M-3 227 L368 237"],
 "less": ["M336 564 L36 288 L265 60"],
 "greater": ["M40 564 L318 288 L59 60"],
 "asterisk": ["M155 736 L126 432", "M9 646 L280 514", "M283 660 L6 502"],
 "numbersign": ["M98 707 L17 6", "M311 707 L231 6", "M-25 454 L382 461", "M-39 242 L369 249"],
 "dollar": ["M315 692 C230 840 71 735 93 590 C115 448 292 344 216 159 C175 54 54 28 1 115", "M254 878 L118 -84"],
 "percent": ["M40 1 L510 794", "M203 750 C112 865 16 595 95 555 C176 517 258 667 203 750", "M446 224 C348 342 263 75 346 30 C420 -14 498 140 446 224"],
 "ampersand": ["M434 436 C338 203 111 -37 25 71 C-56 169 130 347 218 523 C270 638 232 820 139 764 C25 690 85 331 298 79 C352 17 411 59 433 101"],
 "at": ["M407 477 C293 531 208 417 195 318 C175 201 294 197 359 329 L405 482 L372 274 C366 202 488 193 521 367 C570 641 245 728 84 549 C-89 356 5 62 240 58 C352 56 446 91 506 140"],
 "bar": ["M86 817 L3 -95"],
 "asciitilde": ["M22 350 C136 507 222 215 334 373"],
 "asciicircum": ["M39 601 L185 815 L304 598"],
 "grave": ["M107 819 L204 663"],
 "arrowleft": ["M480 315 L7 315 M183 489 L7 315 L158 139"],
 "arrowne": ["M20 81 L403 500 M150 500 L403 500 L403 246"],
 "multiply": ["M55 502 L365 112", "M365 502 L55 112"],
 "acute": ["M115 600 L247 769"],
 "dieresis": ["M85 683 L96 697", "M281 683 L292 697"],
 "circumflex": ["M65 605 L202 776 L314 603"],
 "tilde": ["M23 671 C109 781 222 579 314 700"],
 "cedilla": ["M185 -16 C106 -107 256 -128 191 -213 C163 -242 118 -237 102 -216"],
 "ring": ["M254 735 C165 812 51 739 83 657 C111 574 243 596 254 735"],
 "ogonek": ["M246 17 C88 -78 131 -218 227 -190"],
}

# These two unattested letters use a less regular pen model, calibrated by
# looking at the traced a, b, g, and h. All their centerlines are curves. The
# pressure profiles follow individual strokes, rather than making every stem
# a straight, uniformly thick rail. Seeds keep the irregular ink reproducible.
ROUGH_PEN = {
    "k": {"seed": 1756, "guides": ["b", "h", "l"], "profiles": [
        [(0, .42), (.30, .30), (.62, .42), (.87, 1.02), (1, .68)],
        [(0, .55), (.30, .70), (.56, .85), (.77, .67), (1, .50)],
        [(0, .73), (.40, .84), (.67, .90), (1, .45)],
    ]},
    "q": {"seed": 1759, "guides": ["a", "g", "y"], "profiles": [
        [(0, .45), (.15, .70), (.34, 1.02), (.52, .72), (.72, .75), (1, .45)],
        [(0, .85), (.20, .62), (.45, .40), (.74, .30), (.91, .47), (1, .32)],
    ]},
}

def cubic(a,b,c,d,t):
    return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d

def flatten(path):
    pen=RecordingPen();parse_path(path,pen)
    paths=[];points=[];current=None
    for op,args in pen.value:
        if op=="moveTo":
            if points: paths.append(points)
            current=np.array(args[0],float);points=[current]
        elif op=="lineTo":
            target=np.array(args[0],float)
            count=max(2,int(np.linalg.norm(target-current)/8))
            points.extend(current+(target-current)*t for t in np.linspace(0,1,count)[1:])
            current=target
        elif op=="curveTo":
            a=current;b,c,d=[np.array(p,float) for p in args]
            count=max(8,int((np.linalg.norm(b-a)+np.linalg.norm(c-b)+np.linalg.norm(d-c))/8))
            points.extend(cubic(a,b,c,d,t) for t in np.linspace(0,1,count)[1:])
            current=d
        elif op in ("endPath","closePath"):
            if points:paths.append(points)
            points=[]
    if points:paths.append(points)
    return paths

def stroke(points,slant=.24):
    points=np.array(points,float)
    delta=np.gradient(points,axis=0)
    length=np.maximum(np.linalg.norm(delta,axis=1),.01)
    direction=delta/length[:,None]
    normals=np.column_stack((-direction[:,1],direction[:,0]))
    # A broad nib has the same contrast whether a centerline is traversed up
    # or down. Match the heavier surviving ink, rather than path direction.
    pressure=28+82*np.abs(direction[:,1])**.7
    pressure*=1+.045*np.sin(np.linspace(0,math.pi*4,len(points)))
    left=points+normals*pressure[:,None]/2
    right=points-normals*pressure[:,None]/2
    polygon=np.vstack((left,right[::-1]))
    polygon[:,0]+=slant*polygon[:,1]
    return polygon

def rough_stroke(points,profile,seed,slant=.24):
    points=np.array(points,float)
    distance=np.r_[0,np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))]
    positions=np.linspace(0,distance[-1],max(3,int(distance[-1]/4)+1))
    points=np.column_stack([np.interp(positions,distance,points[:,axis]) for axis in (0,1)])
    closed=np.linalg.norm(points[0]-points[-1])<1
    delta=np.gradient(points,axis=0)
    if closed:delta[0]=delta[-1]=points[1]-points[-2]
    direction=delta/np.maximum(np.linalg.norm(delta,axis=1),.01)[:,None]
    normals=np.column_stack((-direction[:,1],direction[:,0]))
    rng=np.random.default_rng(seed)

    def irregularity(spacing,amplitude):
        knots=np.linspace(0,distance[-1],max(3,int(distance[-1]/spacing)+1))
        values=rng.uniform(-amplitude,amplitude,len(knots))
        if closed:values[-1]=values[0]
        return np.interp(positions,knots,values)

    progress=positions/distance[-1]
    widths=28+82*np.abs(direction[:,1])**.7
    widths*=np.interp(progress,*zip(*profile))
    widths*=1+irregularity(90,.12)
    # Slow wandering follows the hand; independent short edge variations
    # recreate the uneven surviving ink instead of parallel smooth boundaries.
    centers=points+normals*(irregularity(120,4)+irregularity(32,2.5))[:,None]
    left_edge=np.maximum(4,widths/2+irregularity(15,5.5)+irregularity(48,3.5))
    right_edge=np.maximum(4,widths/2+irregularity(12,5)+irregularity(42,3))
    left=centers+normals*left_edge[:,None]
    right=centers-normals*right_edge[:,None]
    if closed:
        polygon=np.vstack((left,right[::-1]))
    else:
        # Small uneven rounded nib endings avoid the old cut-off flat caps.
        angles=np.linspace(0,math.pi,7)
        def cap(index,outwards):
            radius=(left_edge[index]+right_edge[index])/2
            return centers[index]+radius*(np.cos(angles)[:,None]*normals[index]+np.sin(angles)[:,None]*outwards)
        polygon=np.vstack((left,cap(-1,direction[-1]),right[::-1],cap(0,-direction[0])[::-1]))
    polygon[:,0]+=slant*polygon[:,1]
    return polygon

def draw_glyph(paths,rough=None):
    points=[points for path in paths for points in flatten(path)]
    polygons=[rough_stroke(p,rough["profiles"][index],rough["seed"]+index) if rough else stroke(p)
              for index,p in enumerate(points)]
    xmin=min(p[:,0].min() for p in polygons);xmax=max(p[:,0].max() for p in polygons)
    scale=2
    canvas=np.zeros((3000,2400),np.uint8)
    shift=30-xmin
    for polygon in polygons:
        p=np.column_stack(((polygon[:,0]+shift)*scale,(1100-polygon[:,1])*scale))
        cv2.fillPoly(canvas,[np.round(p).astype(np.int32)],255)
    contours,hierarchy=cv2.findContours(canvas,cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)
    result=[]
    for contour in contours:
        if cv2.contourArea(contour)<6:continue
        points=cv2.approxPolyDP(contour,1.2,True).reshape(-1,2)
        coordinates=[[round(float(x)/scale),round(1100-float(y)/scale)] for x,y in points]
        # Very small raster slivers can collapse to a line when rounded to
        # integer font units. They are not useful ink contours.
        if len(set(map(tuple,coordinates)))<3:continue
        area=sum(x*y2-x2*y for (x,y),(x2,y2) in zip(coordinates,coordinates[1:]+coordinates[:1]))
        if abs(area)<4:continue
        result.append(coordinates)
    provenance={
        "method":"drawn","notes":"New centerline drawing matched to the inspected annotation hand.","paths":paths,
        "slant":.24,"verticalStroke":110,"horizontalStroke":28}
    if rough:
        provenance.update({"notes":"Curved pen reconstruction with variable pressure, wandering stroke centers, and uneven ink edges; not directly attested.",
                           "penModel":"irregular-curved-pen", "seed":rough["seed"],
                           "guides":rough["guides"],"pressureProfiles":rough["profiles"],
                           "edgeVariationFontUnits":5.5,"centerVariationFontUnits":6.5})
    return {"advance":round(xmax-xmin+72),"contours":result,"provenance":provenance}

def adapted(original,matrix,advance=None):
    a,b,c,d,tx,ty=matrix
    contours=[[[round(a*x+c*y+tx),round(b*x+d*y+ty)] for x,y in points] for points in original["contours"]]
    xmin=min(x for p in contours for x,y in p);xmax=max(x for p in contours for x,y in p)
    contours=[[[x-xmin+28,y] for x,y in points] for points in contours]
    return {"advance":advance or xmax-xmin+65,"contours":contours,"provenance":{
        "method":"adapted","notes":"New matching character adapted from a traced form; not directly attested.","transform":matrix}}

if __name__=="__main__":
    traced=json.loads((SOURCE/"traced-glyphs.json").read_text(encoding="utf-8"))
    glyphs=traced["glyphs"]
    for key,paths in DRAWINGS.items():
        if key not in glyphs:
            glyphs[key]=draw_glyph(paths,ROUGH_PEN.get(key))
    if "v" not in glyphs:
        glyphs["v"]=adapted(glyphs["V"],[.72,0,0,.60,0,0])
    first=glyphs["u"]
    second=adapted(first,[.90,0,0,1,0,0])
    if "w" not in glyphs: glyphs["w"]={"advance":first["advance"]+second["advance"]-155,
        "contours":first["contours"]+[[[x+first["advance"]-155,y] for x,y in pts] for pts in second["contours"]],
        "provenance":{"method":"adapted","from":"u","notes":"New double-u form constructed from the traced u."}}
    if "9" not in glyphs:
        glyphs["9"]=adapted(glyphs["6"],[-1,0,0,-1,0,740])
    # Dots are original pen marks, not the scan's modern inventory-number stamp.
    dot=glyphs["period"]
    for key,ys in {"colon":[0,335],"semicolon":[335],"middot":[270]}.items():
        contours=[[[x,y+dy] for x,y in p] for dy in ys for p in dot["contours"]]
        if key=="semicolon":contours+=glyphs["comma"]["contours"]
        glyphs[key]={"advance":190,"contours":contours,"provenance":{"method":"adapted","from":"period"}}
    for key in ("question","exclam"):
        glyphs[key]["contours"]+=[[[x+48,y] for x,y in p] for p in dot["contours"]]
    for key in ("quotesingle","quotedbl"):
        original=glyphs[key]
        for direction in ("left","right"):
            name="quote"+("dbl" if key=="quotedbl" else "")+direction
            glyphs[name]=adapted(original,[-1 if direction=="left" else 1,0,0,1,0,0])
    (SOURCE/"glyphs.json").write_text(json.dumps({"family":"Le Raton","unitsPerEm":1000,"glyphs":glyphs},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print("Saved",len(glyphs),"base glyph outlines; accented forms are composed by the font builder.")
