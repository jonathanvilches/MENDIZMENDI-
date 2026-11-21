# Los golpes de la pelota con el eco del frontón (21 de noviembre de 2026; el autor: «el sonido de la pelota ahora mismo no
# está bien»). Parte de los recortes limpios del vídeo del frontón cubierto que pasó el autor (golpes-limpios/: solo el
# impacto, sin los golpes sueltos que se colaban; eran los del juego del 20 de noviembre) y les pone una cola de sala de
# frontón cubierto: primeras reflexiones a 9-38 ms y una cola de 0,9 a 1,15 s, mezclada suave. El frontis, con más sala y
# más fuerte; el bote, más sordo; las tres variantes de cada golpe, igual de fuertes. Escribe en src/assets/sonidos.
# uso: python3 -I tools/sonidos/golpes-eco.py   (necesita numpy y ffmpeg)
import subprocess, numpy as np, os, sys
AQUI=os.path.dirname(os.path.abspath(__file__)); SALE=os.path.join(AQUI,'..','..','src','assets','sonidos'); sr=44100
rng=np.random.default_rng(7)
def load(f):
    raw=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(sr),'-f','f32le','-'],capture_output=True).stdout
    return np.frombuffer(raw,dtype=np.float32).astype(np.float64)
def save(x,f):
    subprocess.run(['ffmpeg','-v','error','-y','-f','f64le','-ar',str(sr),'-ac','1','-i','-','-c:a','libmp3lame','-b:a','96k',f],input=x.tobytes(),check=True)
def lp(x,fc):
    # (el filtro de un polo, en frecuencia: sin bucles)
    n=len(x); N=1<<int(np.ceil(np.log2(n*2))); a=np.exp(-2*np.pi*fc/sr); w=2*np.pi*np.fft.rfftfreq(N)
    H=(1-a)/(1-a*np.exp(-1j*w)); return np.fft.irfft(np.fft.rfft(x,N)*H,N)[:n]
def fftconvolve(x,h):
    n=len(x)+len(h)-1; N=1<<int(np.ceil(np.log2(n))); return np.fft.irfft(np.fft.rfft(x,N)*np.fft.rfft(h,N),N)[:n]
def ir(rt60, bright, pre_ms, taps):
    n=int(rt60*sr); t=np.arange(n)/sr
    no=rng.standard_normal(n); no=lp(no,bright); no=no-lp(no,180)
    h=no*np.exp(-6.91*t/rt60); h[:int(pre_ms/1000*sr)]=0; h/=np.sqrt(np.sum(h**2))
    for ms,g in taps: h[int(ms/1000*sr)]+=g
    return h
IRS={'mano':ir(0.9,5200,14,[(9,.10),(21,.07),(33,.05)]),'frontis':ir(1.15,6000,12,[(11,.14),(24,.09),(38,.06)]),
     'pared':ir(1.0,5600,12,[(10,.12),(23,.08),(36,.05)]),'bote':ir(0.85,3200,15,[(12,.08),(27,.05)])}
WET={'mano':0.16,'frontis':0.24,'pared':0.20,'bote':0.2}
RMS={'mano':-21.5,'frontis':-20.5,'pared':-22.0,'bote':-24.5}
for t in ['mano','frontis','pared','bote']:
    for i in (1,2,3):
        x=load(f'{AQUI}/golpes-limpios/{t}-{i}.mp3'); k=max(0,int(np.argmax(np.abs(x)>0.02))-int(0.0015*sr)); x=x[k:k+int(0.30*sr)]
        m=int(0.06*sr); x[-m:]*=np.linspace(1,0,m)**2
        if t=='bote': x=lp(x,3800)
        L=int(0.9*sr); dry=np.zeros(L); dry[:len(x)]=x
        w=fftconvolve(x,IRS[t]); wet=np.zeros(L); wet[:min(L,len(w))]=w[:L]
        y=dry+WET[t]*wet/(np.abs(wet).max()+1e-9)*np.abs(x).max()
        fo=int(0.25*sr); y[-fo:]*=np.linspace(1,0,fo)**2
        seg=y[:int(0.08*sr)]; y*=10**((RMS[t]-20*np.log10(np.sqrt(np.mean(seg**2))+1e-12))/20)
        pk=np.abs(y).max(); y*= (0.84/pk if pk>0.84 else 1)
        save(y,f'{SALE}/pelota-{t}-{i}.mp3')
        a=np.abs(y); seg=y[:int(0.08*sr)]; tail=y[int(0.08*sr):int(0.3*sr)]
        S=np.abs(np.fft.rfft(seg*np.hanning(len(seg)))); fr=np.fft.rfftfreq(len(seg),1/sr)
        print(f'{t}-{i} rms80 {20*np.log10(np.sqrt(np.mean(seg**2))):6.1f} pico {20*np.log10(a.max()):5.1f} brillo {(S*fr).sum()/S.sum():5.0f} cola {20*np.log10(np.sqrt(np.mean(tail**2))+1e-12):6.1f}')
