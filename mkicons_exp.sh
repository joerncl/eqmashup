#!/bin/sh

ICONDIR=icons_exp

fig2dev -Lppm -Z 20 icon.fig icon.ppm

cat > $ICONDIR/overview.html <<EOF
<html>
  <head>
    <title>Icon Overview</title>
    <style type="text/css">
      html { background: #9bb3cc; }
      td { text-align: center; }
    </style>
  </head>
  <body style="bgcolor: lightblue">
    <h1>Icon Overview</h1>
    <table>
      <tr>
        <td/>
        <td>0</td><td>1</td><td>2</td><td>3</td><td>4</td>
        <td>5</td><td>6</td><td>7</td><td>8</td><td>9</td>
      </tr>
EOF

for m in  4 5 6 7 8 9; do
cat >> $ICONDIR/overview.html <<EOF
      <tr>
        <td>$m</td>
EOF

    for n in 0 1 2 3 4 5 6 7 8 9 ; do
        w=`perl -e "print int(sqrt(10**($m.$n-3))/1.5)"`
        pamscale -width $w icon.ppm > icon_master.ppm
        for g in 0 4 8 c ; do
            ppmchange black rgb:$g/$g/$g icon.ppm | pamscale -width $w | pnminvert | ppmtopgm > icon_stencil.pgm
            pnmtopng -alpha=icon_stencil.pgm icon_master.ppm > icons_exp/eq${m}.${n}_${g}.png
        done
        pnmtopng -transparent white icon_master.ppm > icons_exp/eq${m}.${n}.png
        ppmtogif -transparent white icon_master.ppm > icons_exp/eq${m}.${n}.gif
        cat >> $ICONDIR/overview.html <<EOF
        <td><img src="eq${m}.${n}.png"/></td>
EOF

    done

    cat >> $ICONDIR/overview.html <<EOF
      </tr>
EOF

done
rm -f icon.ppm icon_master.ppm icon_stencil.pgm

cat >> $ICONDIR/overview.html <<EOF
    </table>
  </body>
</html>
EOF