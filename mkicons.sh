#!/bin/sh

fig2dev -Lppm -Z 20 icon.fig icon.ppm

for m in 1 2 3 4 5 6 7 8 9 ; do
    for n in 0 1 2 3 4 5 6 7 8 9 ; do
        w=`expr $m$n \* 6 / 10`
        pamscale -width $w icon.ppm > icon_master.ppm
        for g in 0 4 8 c ; do
            ppmchange black rgb:$g/$g/$g icon.ppm | pamscale -width $w | pnminvert | ppmtopgm > icon_stencil.pgm
            pnmtopng -alpha=icon_stencil.pgm icon_master.ppm > eq${m}.${n}_${g}.png
        done
        pnmtopng -transparent white icon_master.ppm > eq${m}.${n}.png
        ppmtogif -transparent white icon_master.ppm > eq${m}.${n}.gif
    done
done
rm -f icon.ppm icon_master.ppm icon_stencil.pgm
