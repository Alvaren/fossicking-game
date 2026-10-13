"""Original New England environment kit; fresh headless Blender only.
blender -b --python this.py -- /absolute/worktree/public/models/newengland
Metres, Z up. Rock origins centred; plants rooted at zero. Fixed art seeds.
"""
import bpy, bmesh, math, random, sys, os, json
from mathutils import Vector

OUT = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def linear(v):
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

def material(name, value):
    m = bpy.data.materials.new(name)
    rgb = [linear(int(value[i:i+2], 16) / 255) for i in (0, 2, 4)]
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = .87
    m.use_backface_culling = False
    return m

M = {k: material(k, v) for k, v in {
    'bark':'b3ad95','bark_dark':'777266','bark_light':'d2c9ac',
    'leaf':'586d42','leaf_light':'788752','leaf_dark':'465a3e',
    'grass':'98925d','grass_dry':'b9ac71','grass_green':'667c50',
    'host':'68655e','host_light':'807a6e','host_dark':'484b49',
    'quartz':'d9d6c9','quartz_light':'efeadc','quartz_dark':'b9b8ad',
    'granite':'9b9181','cobble':'898a7c','basalt':'535753',
    'rhyolite':'968579','slab':'79776d',
}.items()}

def parent(name):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    return o

def mesh(name, verts, faces, role, group, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.materials.append(M[role])
    data.update()
    o = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(o)
    o.parent = group
    for p in data.polygons: p.use_smooth = smooth
    return o

def tube(name, points, radii, role, group, sides=7):
    verts, faces = [], []
    for i, pt in enumerate(points):
        axis = Vector(points[min(i+1, len(points)-1)]) - Vector(points[max(0, i-1)])
        axis.normalize()
        u = axis.cross(Vector((0, 1, 0))).normalized()
        if u.length < .1: u = axis.cross(Vector((1,0,0))).normalized()
        v = axis.cross(u).normalized()
        for k in range(sides):
            a = k * math.tau / sides
            verts.append(Vector(pt) + radii[i] * (u*math.cos(a)+v*math.sin(a)))
    for i in range(len(points)-1):
        for k in range(sides):
            a=i*sides+k; b=i*sides+(k+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(range(sides-1,-1,-1)), tuple((len(points)-1)*sides+k for k in range(sides))])
    return mesh(name, verts, faces, role, group, True)

def leaves(name, centres, rng, group, small=False):
    # Individually folded lanceolate leaves, arranged as branch-end sprays.
    verts, faces, mats = [], [], []
    for centre, radius, count in centres:
        for j in range(count):
            a=rng.random()*math.tau; r=math.sqrt(rng.random())*radius
            c=Vector(centre)+Vector((math.cos(a)*r,math.sin(a)*r,(rng.random()-.5)*radius*1.35))
            direction=a+rng.uniform(-1.6,1.6)
            d=Vector((math.cos(direction),math.sin(direction),-.2-rng.random()*.45))
            side=Vector((-math.sin(direction),math.cos(direction),.1))
            length=(.19+rng.random()*.15)*( .55 if small else 1)
            width=length*(.5 if small else .39)
            v=[c-d*length,c-d*length*.35+side*width,c+Vector((0,0,width*.3)),c+d*length,c-d*length*.35-side*width]
            n=len(verts); verts.extend(v)
            faces.extend([(n,n+1,n+2),(n+1,n+3,n+2),(n+3,n+4,n+2),(n+4,n,n+2)])
            mats.extend([rng.choices([0,1,2],[6,3,2])[0]]*4)
    o=mesh(name,verts,faces,'leaf',group)
    o.data.materials.append(M['leaf_light']);o.data.materials.append(M['leaf_dark'])
    for p,i in zip(o.data.polygons,mats): p.material_index=i
    # Crown-shaped normals give leaf masses soft volume instead of black cards.
    normals=[]
    for p in o.data.polygons:
        for vi in p.vertices:
            co=o.data.vertices[vi].co
            normals.append(Vector((co.x*.12,co.y*.12,.8)).normalized())
    o.data.normals_split_custom_set(normals)

def tree(index, young=False):
    rng=random.Random(1800+index+(500 if young else 0))
    g=parent(('young_' if young else 'gum_')+str(index))
    h=(4.2 if young else [7.2,10.5,8.4,6.0][index])+rng.random()*1.2
    lean=Vector((rng.uniform(-.65,.65),rng.uniform(-.65,.65),0))
    trunk=[Vector((0,0,0)),Vector((.02,-.02,h*.23)),lean*.45+Vector((0,0,h*.46)),lean+Vector((0,0,h*.72))]
    tube('bark_trunk',trunk,[.28,.225,.155,.065] if not young else [.14,.12,.08,.035],'bark',g,9)
    centres=[]
    # Connected scaffold forks, then secondary branches and hanging sprays.
    for j in range(7 if not young else 5):
        a=j*2.399+rng.uniform(-.3,.3)
        start=trunk[1].lerp(trunk[3],.22+j*.105)
        spread=(2.2+rng.random()*1.35)*( .65 if young else [1.15,.8,1.3,.85][index])
        end=Vector((start.x+math.cos(a)*spread,start.y+math.sin(a)*spread,h*(.8+rng.random()*.2)))
        elbow=start.lerp(end,.52)+Vector((0,0,.4))
        tube('bark_fork',[start,elbow,end],[.12*(1-j*.06),.068,.018],'bark_light' if j%3 else 'bark',g)
        for k in range(3):
            b=a+(k-1)*.7
            tip=end+Vector((math.cos(b)*.9,math.sin(b)*.9,rng.uniform(-.2,.6)))
            tube('bark_twig',[elbow.lerp(end,.7),tip],[.025,.005],'bark',g,5)
            centres.append((tip,.8+rng.random()*.42,95 if not young else 65))
    leaves('leaf_crown',centres,rng,g)
    for j in range(5):
        a=j*math.tau/5+.2
        tube('bark_root',[(0,0,.35),(math.cos(a)*.35,math.sin(a)*.35,.09),(math.cos(a)*.65,math.sin(a)*.65,-.035)],[.13,.08,.008],'bark_dark',g,6)

def shrub(index):
    rng=random.Random(600+index);g=parent('shrub_'+str(index)); centres=[]
    for j in range(9):
        a=j*2.4; h=.55+rng.random()*.8
        end=Vector((math.cos(a)*.45,math.sin(a)*.45,h))
        tube('bark_shrub',[(0,0,0),end*.6,end],[.025,.018,.004],'bark_dark',g,5)
        centres.append((end,.3+index*.04,65))
    leaves('leaf_shrub',centres,rng,g,True)

def grass(index, sedge=False):
    rng=random.Random(300+index+100*sedge);g=parent(('sedge_' if sedge else 'grass_')+str(index))
    verts=[];faces=[]
    for j in range(42 if sedge else 32):
        a=rng.random()*math.tau; r=math.sqrt(rng.random())*.19
        h=.4+rng.random()*(.65 if sedge else .4);bend=.2+rng.random()*.4
        width=.018+rng.random()*.022
        d=Vector((math.cos(a),math.sin(a),0));s=Vector((-math.sin(a),math.cos(a),0))
        base=d*r
        points=[base,base+d*bend*.17+Vector((0,0,h*.42)),base+d*bend*.55+Vector((0,0,h*.78)),base+d*bend+Vector((0,0,h*.86))]
        n=len(verts)
        for k,p in enumerate(points):
            w=width*(1-k/3)
            verts.extend([p-s*w,p+s*w])
        for k in range(3):faces.append((n+k*2,n+k*2+1,n+k*2+3,n+k*2+2))
    o=mesh('grass_blades',verts,faces,'grass_green' if sedge else 'grass',g)
    o.data.materials.append(M['grass_dry'])
    for p in o.data.polygons: p.material_index=int(not sedge and rng.random()<.4)

def block(name, rng, group, role, scale=(1,1,1), rounded=False, seam=False):
    # A bevelled, sheared block with independent joint cuts: broad planes remain.
    if role=='cobble': bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1)
    elif role in ['host','basalt','rhyolite','slab']:
        points=[]
        for height,radius in [(-.95,.83),(-.18,1),(.85,.74)]:
            for j in range(7):
                angle=j*math.tau/7+.09
                r=radius*rng.uniform(.86,1.1)
                points.append((math.cos(angle)*r+height*.12,math.sin(angle)*r,height+rng.uniform(-.09,.09)))
        data=bpy.data.meshes.new(name);data.from_pydata(points,[],[])
        bm=bmesh.new();bm.from_mesh(data);bmesh.ops.convex_hull(bm,input=list(bm.verts));bm.to_mesh(data);bm.free()
        obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    else: bpy.ops.mesh.primitive_cube_add(size=2)
    o=bpy.context.object;o.name=name;o.parent=group
    for v in o.data.vertices:
        x,y,z=v.co
        if role=='cobble':
            shape=1+.07*math.sin(x*5+y*3)+.06*math.sin(y*4-z*2)
            v.co=(x*shape*scale[0],y*shape*scale[1],z*scale[2])
        else:
            v.co=(x*scale[0]+z*.20+rng.uniform(-.15,.15), y*scale[1]+x*.15+rng.uniform(-.1,.1), z*scale[2]+x*.11+rng.uniform(-.08,.08))
    if role!='cobble':
        bevel=o.modifiers.new('weathered edges','BEVEL');bevel.width=.28 if rounded else .13;bevel.segments=3 if rounded else 1
        bpy.ops.object.modifier_apply(modifier=bevel.name)
    bm=bmesh.new();bm.from_mesh(o.data)
    for j in range(5 if rounded else 10):
        n=Vector((rng.uniform(-1,1),rng.uniform(-1,1),rng.uniform(-1,1))).normalized()
        result=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=n*(.73+rng.random()*.35),plane_no=n,clear_outer=True)
        edges=[e for e in result['geom_cut'] if isinstance(e,bmesh.types.BMEdge) and e.is_boundary]
        if edges:bmesh.ops.holes_fill(bm,edges=edges,sides=0)
    bm.normal_update();bm.to_mesh(o.data);bm.free()
    if role=='granite':
        # Existing tor stacks expect a unit vertical half-extent, not a flat slab.
        extent=max(abs(v.co.z) for v in o.data.vertices)
        for v in o.data.vertices:v.co.z*=1.04/extent
    o.data.materials.append(M[role])
    # Add a subtle face colour variation, not random displacement of every vertex.
    for suffix,factor in [('warm',1.08),('cool',.88)]:
        m=M[role].copy();m.name=role+'_'+suffix
        col=tuple(min(1,v*factor) for v in m.diffuse_color[:3])
        m.diffuse_color=(*col,1);m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*col,1)
        o.data.materials.append(m)
    for p in o.data.polygons:p.material_index=rng.choices([0,1,2],[8,1,1])[0]
    if rounded and role!='cobble':
        # Weighted smooth normals retain joint planes while rounding shoulders.
        for p in o.data.polygons:p.use_smooth=True
        mod=o.modifiers.new('weighted rock normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=30
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if seam:
        # Partition the SAME solid with two planes. Quartz occupies the gap.
        normal=Vector((-.35,.08,1)).normalized();width=.075+rng.random()*.075
        original=o.data.copy()
        bm=bmesh.new();bm.from_mesh(original)
        bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=2,use_grid_fill=True)
        bm.to_mesh(original);bm.free()
        for k,(lo,hi,mat) in enumerate([(-99,-width,role),(-width,width,'quartz'),(width,99,role)]):
            bm=bmesh.new();bm.from_mesh(original)
            for dist,clear_inner in [(lo,True),(hi,False)]:
                if abs(dist)>90:continue
                result=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=normal*dist,plane_no=normal,clear_inner=clear_inner,clear_outer=not clear_inner)
                edges=[e for e in result['geom_cut'] if isinstance(e,bmesh.types.BMEdge) and e.is_boundary]
                if edges:bmesh.ops.holes_fill(bm,edges=edges,sides=0)
            data=bpy.data.meshes.new(name+str(k));bm.normal_update();bm.to_mesh(data);bm.free()
            for v in data.vertices:
                v.co.z+=.045*math.sin(v.co.x*7+v.co.y*3)+.022*math.sin(v.co.x*17-v.co.y*5)
            obj=bpy.data.objects.new(('quartz_seam' if k==1 else 'host_joint')+str(k),data);bpy.context.collection.objects.link(obj);obj.parent=group
            data.materials.append(M[mat])
            for p in data.polygons:p.material_index=0
        bpy.data.objects.remove(o,do_unlink=True)
    return group

for i in range(4):tree(i)
for i in range(2):tree(i,True)
for i in range(3):shrub(i);grass(i)
for i in range(2):grass(i,True)
for kind,count in [('host',4),('granite',4),('cobble',6),('basalt',3),('rhyolite',3),('slab',3)]:
    for i in range(count):
        rng=random.Random(7000+sum(map(ord,kind))+i*59);g=parent(f'{kind}_{i}')
        sc=(.85+rng.random()*.12,.7+rng.random()*.22,.3 if kind=='slab' else .65+rng.random()*.2)
        block(kind,rng,g,kind,sc,kind in ['granite','cobble'],kind=='host')
for kind,count in [('root',2),('branch',3)]:
    for i in range(count):
        rng=random.Random(900+i);g=parent(f'{kind}_{i}')
        for j in range(3 if kind=='root' else 1):
            a=j*2.2;end=Vector((math.cos(a)*(1.1+i*.2),math.sin(a)*.6,-.04))
            tube('bark_detail',[Vector((0,0,.25)),end*.45+Vector((0,0,.12)),end],[.12,.065,.009],'bark_dark',g,7)

manifest={}
for g in [o for o in bpy.data.objects if o.type=='EMPTY']:
    coords=[];tris=0
    for o in g.children:
        if o.type!='MESH':continue
        o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
        coords.extend([v.co[:] for v in o.data.vertices])
    manifest[g.name]={'triangles':tris,'blenderBounds':[[min(v[k] for v in coords) for k in range(3)],[max(v[k] for v in coords) for k in range(3)]]}
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'environment.glb'),export_format='GLB',export_yup=True,export_apply=True,export_extras=True)
with open(os.path.join(OUT,'manifest.json'),'w',encoding='utf-8') as f:json.dump({'generator':'blender/build_newengland_environment.py','units':'metres','sourceUp':'Z','gameUp':'Y','assets':manifest},f,indent=2);f.write('\n')
print('NEW_ENGLAND_KIT',len(manifest),'assets',sum(v['triangles'] for v in manifest.values()),'triangles')
