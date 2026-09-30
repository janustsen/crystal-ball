"""Extract reusable art from the authorized Crystal Ball design export."""
import base64, gzip, json, pathlib, re, sys
source = pathlib.Path(sys.argv[1]).read_text()
def unpack(source):
    manifest = json.loads(re.search(r'<script type="__bundler/manifest">(.*?)</script>', source, re.S)[1])
    template = json.loads(re.search(r'<script type="__bundler/template">(.*?)</script>', source, re.S)[1])
    assets = {key: gzip.decompress(base64.b64decode(v['data'])) if v.get('compressed') else base64.b64decode(v['data']) for key, v in manifest.items()}
    return template, assets
_, pages = unpack(source)
home, assets = unpack(next(iter(pages.values())).decode())
def svg_attrs(s):
    return re.sub(r'sc-camel-([a-z-]+)', lambda m: re.sub(r'-([a-z])', lambda n:n[1].upper(), m[1]), s)
fonts = [('65429151-08f8-401d-bc3d-ae8d9a3bf58c','HankenGrotesk'), ('cb71d6ee-9534-4d6a-affc-f328de943cb9','IMFellEnglish'), ('a19889db-f47b-4e13-8e90-f5da4a2a29e5','IMFellEnglishItalic')]
for key, name in fonts:
    pathlib.Path(f'assets/fonts/{name}.woff2').write_bytes(assets[key])
orb = svg_attrs(re.search(r'<div class="orb hero".*?</svg></div></a>',home,re.S)[0].removesuffix('</a>'))
orb = re.sub(r' style="--s: 240px"','',orb,count=1)
css = re.findall(r'<style>(.*?)</style>',home,re.S)[1]
shader = re.search(r'const FS = `(.*?)`;',home,re.S)[1]
pathlib.Path('src/designArt.ts').write_text('// Extracted from the authorized Crystal Ball.html reference by scripts/import-design.py.\n'+ '\n'.join('export const '+k+' = '+json.dumps(v)+';' for k,v in [('orbMarkup',orb),('designCss',css),('mistShader',shader)])+'\n')
# The same glass, smoke, reflections and brass stand for native and exported images.
optics=re.search(r'<svg class="optics".*?</svg>',orb,re.S)[0]
stand=re.search(r'<svg class="stand".*?</svg>',orb,re.S)[0]
noise=re.search(r'<div class="fb">(<svg.*?</svg>)',orb,re.S)[1]
noise=re.sub(r'<svg[^>]+>','<svg x="0" y="0" width="200" height="200" viewBox="0 0 200 200">',noise,count=1)
optics=re.sub(r'<svg[^>]+>','<svg width="200" height="200" viewBox="0 0 200 200">',optics,count=1)
stand=re.sub(r'<svg[^>]+>','<svg x="36" y="184" width="128" height="36.6" viewBox="0 0 140 40">',stand,count=1)
art='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 225"><defs><radialGradient id="glass"><stop stop-color="#382919"/><stop offset=".8" stop-color="#1a120c"/><stop offset="1" stop-color="#060402"/></radialGradient><clipPath id="sphere"><circle cx="100" cy="100" r="99"/></clipPath></defs><circle cx="100" cy="100" r="100" fill="url(#glass)"/><g clip-path="url(#sphere)" opacity=".65">'+noise+'</g>'+optics+stand+'</svg>'
pathlib.Path('src/orbArtwork.ts').write_text('// Glass and brass artwork from the authorized design export.\nexport const orbArtwork = '+json.dumps(art)+';\n')

icons={}
for item in re.findall(r'<a class="tab[^\"]*"[^>]*>(.*?)</a>',home,re.S):
    label=re.search(r'<span>(.*?)</span>',item)[1]
    icons[label]=svg_attrs(re.search(r'<svg.*?</svg>',item,re.S)[0])
assert set(icons)=={'Home','Explore','History','You'}
assert all('<a ' not in icon and icon.count('<svg')==1 for icon in icons.values())
with pathlib.Path('src/designArt.ts').open('a') as f: f.write('export const tabArtwork:Record<string,string> = '+json.dumps(icons)+';\n')

# react-native-svg does not implement turbulence/displacement. Preserve the exact
# artwork for native through a static PNG instead of silently losing its smoke.
import subprocess
subprocess.run(['node', '--input-type=module', '-e', "import sharp from 'sharp'; import {orbArtwork} from './src/orbArtwork.ts'; await sharp(Buffer.from(orbArtwork)).resize(600,675).png().toFile('assets/orb.png');"], check=True)
