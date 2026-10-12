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
 "j": ["M152 399 C135 291 107 140 81 -28 C65 -146 51 -257 11 -312 C-23 -358 -81 -346 -86 -311 C-90 -274 -43 -243 13 -237"],
 "k": ["M54 11 C89 164 94 341 135 533 C160 650 199 761 222 829", "M88 196 C147 295 251 444 288 408 C328 366 231 290 131 226", "M142 225 C200 208 183 60 249 27 C282 11 315 47 344 81"],
 "l": ["M42 45 C128 278 218 610 205 755 C196 863 115 773 99 662 C79 411 82 171 45 62 C36 9 80 15 142 65"],
 "q": ["M298 405 C251 434 141 345 90 243 C41 145 49 45 104 55 C177 64 270 236 298 405 Z", "M307 408 C294 320 281 213 265 103 C245 -41 211 -222 216 -335 C217 -380 249 -345 280 -314"],
 "s": ["M275 402 C216 479 118 450 102 364 C92 304 221 240 208 125 C192 11 80 -30 28 47 C1 89 50 135 110 124"],
 "x": ["M40 398 C102 472 116 382 151 258 C187 134 188 18 271 43 C311 55 332 91 344 117", "M325 437 C242 335 112 89 26 16"],
 "y": ["M91 420 C74 284 27 42 109 45 C196 51 276 308 305 434 L218 -169 C194 -343 62 -405 18 -317 C-15 -247 86 -186 241 -144"],
 "w": ["M82 410 C71 328 42 168 64 78 C77 27 120 39 154 94 C200 169 235 329 252 427 C242 329 221 177 236 94 C246 37 290 32 326 83 C383 160 442 332 467 422 C445 304 418 151 427 73 C433 30 472 51 515 95"],
 "z": ["M46 367 C127 427 215 432 277 393 C239 306 156 184 70 69 C123 78 212 79 261 42 C315 1 269 -115 187 -133 C127 -146 116 -91 169 -46 C204 -16 251 -9 301 8"],
 "A": ["M12 24 C115 239 260 541 355 803 C371 850 391 830 386 776 L374 73 C376 22 428 44 469 79", "M100 254 C190 283 309 303 410 293"],
 "B": ["M48 12 L125 806 M63 678 C125 846 401 847 450 732 C495 614 347 437 133 442 M119 443 C352 545 467 391 394 215 C350 102 183 -14 58 16"],
 "C": ["M525 740 C409 903 179 796 84 535 C-14 282 28 30 187 26 C287 13 399 70 457 148"],
 "D": ["M56 12 L137 806 M55 701 C222 868 449 837 474 637 C511 382 318 41 151 19 C67 6 34 44 61 93"],
 "E": ["M441 747 C313 896 143 782 125 622 C105 449 282 438 338 502 M321 482 C217 423 76 474 29 263 C-15 66 122 -37 294 31 C348 52 388 95 411 122"],
 "F": ["M57 12 L143 798 M75 702 C198 817 384 866 487 785 M104 451 C199 474 302 476 356 501"],
 "G": ["M519 737 C408 903 190 799 86 538 C-9 285 32 33 183 27 C286 17 394 98 432 209 L454 431 C404 412 348 399 307 415"],
 "H": ["M41 19 L126 812 M376 17 L463 815 M76 418 C216 420 343 459 441 469"],
 "J": ["M280 801 L169 108 C139 -125 47 -263 -35 -177 C-69 -111 2 -45 127 -8 M174 796 C229 809 321 819 363 801"],
 "K": ["M45 14 C76 215 100 428 139 648 C149 715 183 787 203 822", "M124 359 C188 466 314 619 375 713 C407 765 455 823 477 820 C506 817 473 773 444 754", "M167 414 C253 414 245 187 334 62 C368 12 413 54 458 80"],
 "M": ["M36 16 C67 257 104 534 139 782 C143 825 171 793 177 711 C187 563 175 335 206 125 C266 307 383 664 450 799 C473 844 493 810 485 741 C452 509 410 218 415 69 C418 13 454 36 488 72"],
 "N": ["M39 13 C79 226 102 536 139 815 C155 842 158 765 162 668 C171 421 233 94 269 40 C284 124 341 449 383 711 C397 766 414 795 438 815"],
 "O": ["M425 756 C306 892 134 751 70 505 C-5 241 37 44 152 20 C289 -8 429 191 463 427 C488 584 487 724 425 756"],
 "P": ["M52 9 L135 802 M54 674 C161 869 414 871 451 725 C499 532 281 366 111 425"],
 # Q adds this pen-drawn tail to the actual traced O below.
 "Q": ["M210 112 C260 62 280 -63 363 -118 C421 -156 481 -121 528 -70"],
 "S": ["M437 756 C373 889 198 829 147 692 C80 512 330 393 304 211 C274 38 103 -36 24 79 C-17 144 70 223 142 207"],
 "U": ["M80 801 C75 626 34 285 63 123 C74 56 112 20 158 52 C255 113 334 431 393 672 C406 729 424 781 444 811 C425 694 397 511 378 319 C365 181 351 85 367 53 C379 22 420 59 452 91"],
 "W": ["M55 812 C67 490 71 247 94 74 C108 13 166 195 216 330 C278 513 331 709 375 796 C412 879 357 451 361 91 C361 12 423 196 481 347 C574 545 620 730 660 816"],
 "X": ["M78 796 C193 855 194 667 221 485 C247 292 251 54 352 34 C398 33 439 78 458 122", "M479 829 C318 594 150 238 16 16"],
 "Y": ["M51 796 C65 718 55 552 97 465 C131 396 193 434 239 505 C299 595 373 744 416 818", "M242 504 C221 380 175 176 168 86 C164 11 208 26 249 64"],
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

# Every unattested alphabetic form uses curved centerlines and individual
# pressure profiles. Traced glyphs bypass this model entirely. The guides name
# actual ink forms used for visual comparison, not attestations of new letters.
# Fixed seeds keep the irregular edges and wandering centers reproducible.
ROUGH_PEN = {
    "K": {"seed": 17560, "guides": ["H", "A", "R"], "profiles": [
        [(0,.35),(.28,.32),(.62,.48),(.87,.86),(1,.47)],
        [(0,.35),(.33,.40),(.65,.55),(.87,.72),(1,.37)],
        [(0,.54),(.32,.75),(.58,.88),(.79,.65),(1,.35)],
    ]},
    "M": {"seed": 17561, "guides": ["H", "A", "m"], "profiles": [
        [(0,.34),(.17,.42),(.24,.77),(.34,.76),(.43,.34),
         (.56,.30),(.67,.73),(.73,.90),(.85,.56),(.96,.37),(1,.40)],
    ]},
    "N": {"seed": 17562, "guides": ["H", "A", "n"], "profiles": [
        [(0,.32),(.24,.47),(.34,.79),(.53,.86),(.65,.46),(.79,.28),(.95,.50),(1,.69)],
    ]},
    "Q": {"seed": 17563, "guides": ["O", "g", "y"], "profiles": [
        [(0,.36),(.29,.59),(.53,.71),(.73,.44),(1,.27)],
    ]},
    "U": {"seed": 17564, "guides": ["H", "u", "v"], "profiles": [
        [(0,.77),(.22,.67),(.34,.38),(.48,.29),(.63,.42),
         (.72,.84),(.87,.63),(.94,.40),(1,.31)],
    ]},
    "W": {"seed": 17565, "guides": ["V", "H", "v", "u"], "profiles": [
        [(0,.75),(.20,.60),(.27,.33),(.43,.30),(.53,.69),
         (.66,.73),(.74,.39),(.87,.31),(1,.58)],
    ]},
    "Y": {"seed": 17566, "guides": ["V", "H", "y"], "profiles": [
        [(0,.67),(.25,.76),(.47,.51),(.72,.34),(1,.63)],
        [(0,.49),(.33,.34),(.66,.27),(.89,.69),(1,.36)],
    ]},
    "j": {"seed": 17567, "guides": ["i", "g", "y"], "profiles": [
        [(0,.78),(.19,.63),(.47,.29),(.68,.28),(.83,.68),(1,.33)],
    ]},
    "k": {"seed": 1756, "guides": ["b", "h", "l"], "profiles": [
        [(0, .42), (.30, .30), (.62, .42), (.87, 1.02), (1, .68)],
        [(0, .55), (.30, .70), (.56, .85), (.77, .67), (1, .50)],
        [(0, .73), (.40, .84), (.67, .90), (1, .45)],
    ]},
    "q": {"seed": 1759, "guides": ["a", "g", "y"], "profiles": [
        [(0, .45), (.15, .70), (.34, 1.02), (.52, .72), (.72, .75), (1, .45)],
        [(0, .85), (.20, .62), (.45, .40), (.74, .30), (.91, .47), (1, .32)],
    ]},
    "w": {"seed": 17568, "guides": ["u", "v", "m"], "profiles": [
        [(0,.61),(.11,.81),(.21,.35),(.32,.29),(.43,.85),
         (.56,.68),(.66,.30),(.77,.43),(.89,.75),(1,.34)],
    ]},
    "z": {"seed": 17569, "guides": ["Z", "n", "y"], "profiles": [
        [(0,.43),(.14,.67),(.34,.44),(.48,.56),(.61,.53),(.77,.30),(.90,.39),(1,.25)],
    ]},
}

# These forms have open valleys and joins rather than enclosed letter counters.
# A tight retracing of their stems must read as a full nib mark, not an outline.
for key in "KMNUWYkw":ROUGH_PEN[key]["solidStrokeInteriors"]=True

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
    # Paint a union of the nib's swept sections, not one self-intersecting
    # outline. An even-odd fill of the full outline erased ink where a stroke
    # doubled back, producing white slits inside M, N, U, W and w stems.
    # Each triangular section adds ink independently, including at tight turns.
    polygons=[]
    for index in range(len(points)-1):
        polygons.extend((np.array([left[index],left[index+1],right[index+1]]),
                         np.array([left[index],right[index+1],right[index]])))
    # A nib also contacts the paper as it turns. Round contacts at tight bends
    # join adjacent sweep sections without leaving a pinhole inside the ink.
    turns=np.sum(direction[:-1]*direction[1:],axis=1)
    angles=np.linspace(0,2*math.pi,17)
    circle=np.column_stack((np.cos(angles),np.sin(angles)))
    for index in np.flatnonzero(turns<math.cos(math.radians(8)))+1:
        polygons.append(centers[index]+min(left_edge[index],right_edge[index])*circle)
    if not closed:
        # Independent cap fans meet the asymmetric edges without crossing the
        # opposite end of the outline. Natural letter counters remain open.
        angles=np.linspace(0,math.pi,7)
        def cap(index,outwards):
            radius=(left_edge[index]*(1+np.cos(angles))+
                    right_edge[index]*(1-np.cos(angles)))/2
            return centers[index]+radius[:,None]*(np.cos(angles)[:,None]*normals[index]+np.sin(angles)[:,None]*outwards)
        for index,outwards in ((0,-direction[0]),(-1,direction[-1])):
            edge=cap(index,outwards)
            polygons.extend(np.array([centers[index],one,two]) for one,two in zip(edge,edge[1:]))
    for polygon in polygons:polygon[:,0]+=slant*polygon[:,1]
    return polygons

def seal_pen_pinholes(canvas,scale,solid_interiors=False):
    # Solid-stem forms have no intended enclosed counters. Other forms retain
    # their larger counters, with only tiny sub-nib voids closed. The outside
    # edge stays rough. This never processes historical traces.
    contours,hierarchy=cv2.findContours(canvas,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is not None:
        for index,contour in enumerate(contours):
            if hierarchy[0,index,3]>=0 and (solid_interiors or cv2.contourArea(contour)<100*scale*scale):
                cv2.drawContours(canvas,contours,index,255,cv2.FILLED)
    return canvas

def draw_glyph(paths,rough=None):
    points=[points for path in paths for points in flatten(path)]
    polygons=[polygon for index,p in enumerate(points)
              for polygon in (rough_stroke(p,rough["profiles"][index],rough["seed"]+index) if rough else [stroke(p)])]
    xmin=min(p[:,0].min() for p in polygons);xmax=max(p[:,0].max() for p in polygons)
    scale=2
    canvas=np.zeros((3000,2400),np.uint8)
    shift=30-xmin
    for polygon in polygons:
        p=np.column_stack(((polygon[:,0]+shift)*scale,(1100-polygon[:,1])*scale))
        cv2.fillPoly(canvas,[np.round(p).astype(np.int32)],255)
    if rough:seal_pen_pinholes(canvas,scale,rough.get("solidStrokeInteriors",False))
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
                           "edgeVariationFontUnits":5.5,"centerVariationFontUnits":6.5,
                           "inkFill":"union-of-swept-nib-sections",
                           "solidStrokeInteriors":rough.get("solidStrokeInteriors",False),
                           "maximumSealedPinholeAreaFontUnits2":100})
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
    # Preserve O's surviving ink rather than inventing a regular new oval.
    if glyphs["Q"]["provenance"]["method"]!="traced":
        tail=glyphs["Q"]
        body=glyphs["O"]
        contours=body["contours"]+[[[x+320,y] for x,y in points] for points in tail["contours"]]
        glyphs["Q"]={"advance":body["advance"],"contours":contours,"provenance":{
            **tail["provenance"],"method":"composed","from":["O","drawn tail"],
            "tailOffset":[320,0],"notes":"Traced O body with a curved pen-drawn tail; Q itself is not directly attested."}}
    if glyphs["j"]["provenance"]["method"]!="traced":
        record=glyphs["j"]
        dot=[points for points in glyphs["i"]["contours"] if min(y for x,y in points)>500]
        # Centre the source dot above j's entry, then allow the lower loop to
        # overhang the preceding letter instead of padding the word with it.
        entry=[x for points in record["contours"] for x,y in points if y>370]
        dot_x=[x for points in dot for x,y in points]
        offset=round((min(entry)+max(entry)-min(dot_x)-max(dot_x))/2)+42
        record["contours"]+=[[[x+offset,y] for x,y in points] for points in dot]
        body_x=[x for points in record["contours"] for x,y in points if y>=0]
        shift=30-min(body_x)
        record["contours"]=[[[x+shift,y] for x,y in points] for points in record["contours"]]
        record["advance"]=max(body_x)-min(body_x)+100
        record["provenance"].update({"dotFrom":"i","dotOffset":[offset+shift,0],
            "spacing":"Upper body sets advance; the curved descender overhangs.",
            "notes":"Curved pen-drawn j stem and descender with the directly traced i dot; j itself is not directly attested."})
    if "v" not in glyphs:
        glyphs["v"]=adapted(glyphs["V"],[.72,0,0,.60,0,0])
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
    # Apply layout translations only after reconstructing from raw traces.
    # Dots and flourishes can overhang; moving an origin must never reshape ink
    # or feed back into the pen reconstruction and compound-dot placement.
    spacing=json.loads((SOURCE/"spacing.json").read_text(encoding="utf-8"))
    for key,layout in spacing["glyphMetrics"].items():
        record=glyphs[key]
        assert record["advance"]==layout["expectedUnspacedAdvance"],key
        shift=layout["xShift"]
        record["contours"]=[[[x+shift,y] for x,y in points] for points in record["contours"]]
        record["advance"]=layout["advance"]
        record["provenance"]["layoutSpacing"]={
            "xShift":shift,"advance":layout["advance"],"reference":"spacing.json",
            "notes":layout["reason"]}
    (SOURCE/"glyphs.json").write_text(json.dumps({"family":"Le Raton","unitsPerEm":1000,"glyphs":glyphs},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print("Saved",len(glyphs),"base glyph outlines; accented forms are composed by the font builder.")
