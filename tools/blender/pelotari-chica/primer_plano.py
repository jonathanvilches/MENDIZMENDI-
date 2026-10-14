import bpy, sys, math
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
argv = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=argv[0])
import vistas
from mathutils import Vector
vistas.W = int(argv[2]); vistas.out = argv[1]
vistas.montar()
vistas.render('frente-cara', 0, 1.43, Vector((0, 0, 1.40)), 1.25, 85, vistas.W)
