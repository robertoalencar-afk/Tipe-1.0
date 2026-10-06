import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TipeLogo } from './Logo';
import { LivingTable, ProductPhone, SharedTable, Recognition } from './MesaVivaScenes';

const scenes = [
 { words: ['A mesa', 'ganhou', 'vida.'], accent: 2, ms: 4800 },
 { words: ['Sua mesa.', 'Sua conta.', 'Seu celular.'], accent: 2, ms: 6500 },
 { words: ['Cada um', 'paga do', 'seu jeito.'], accent: 2, ms: 6000 },
 { words: ['Escolha.', 'Pague.', 'Continue.'], accent: 1, ms: 6500 },
 { words: ['Bom serviço', 'merece', 'reconhecimento.'], accent: 2, ms: 5800 },
 { words: ['Pague.', 'Sem esperar.'], accent: 1, ms: 5500 },
];
function BrandFinal() {
 return <div className="mv-brand-final"><div className="mv-brand-ring"><svg aria-hidden viewBox="0 0 360 360"><circle className="mv-brand-track" cx="180" cy="180" r="169" /><circle className="mv-brand-stroke" cx="180" cy="180" r="169" /></svg><TipeLogo className="mv-official-logo" /></div><div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild className="h-12 rounded-full px-5 font-bold"><a href="#lista-de-espera">Lista de espera <ChevronRight /></a></Button><Button variant="outline" asChild className="h-12 rounded-full border-secondary-foreground/30 bg-transparent px-5 text-secondary-foreground hover:bg-secondary-foreground/10"><Link to="/simulador">Simular <ChevronRight /></Link></Button></div></div>;
}
export function MesaViva() {
 const [index,setIndex] = useState(0);
 const [paused,setPaused] = useState(false);
 const [hovered,setHovered] = useState(false);
 const [reduced,setReduced] = useState(false);
 const scene = scenes[index] ?? scenes[0];
 const stopped=paused||hovered||reduced;
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{if(stopped)return;const timer=window.setTimeout(()=>setIndex(n=>(n+1)%scenes.length),scene.ms);return()=>window.clearTimeout(timer);},[index,stopped,scene.ms]);
 return <section aria-label="Como a TIPE funciona" className={`mv-stage mv-stage-${index} relative overflow-hidden bg-secondary text-secondary-foreground`} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
 <div key={index} className="mv-composition">
 <div className="mv-type"><div className="mv-scene-number"><span>0{index+1}</span><span>/ 06</span></div><h2 className="mv-headline">{scene.words.map((word,n)=><span key={word} className="mv-word-line"><span aria-hidden className="mv-type-echo" style={{animationDelay:`${n*130}ms`}}>{word}</span><span className={`mv-type-word ${n===scene.accent?'text-primary':''}`} style={{animationDelay:`${n*130}ms`}}>{word}</span></span>)}</h2>{index===3&&<p className="mv-support mv-slide">Digital confirmado. No estabelecimento, após o recebimento.</p>}</div>
 <div className="mv-visual">{index===0?<LivingTable />:index===1?<div className="mv-account-scene"><LivingTable orbit /><ProductPhone /></div>:index===2?<SharedTable />:index===3?<ProductPhone payment />:index===4?<Recognition />:<BrandFinal />}</div>
 </div>
 <div className="mv-controls"><div className="flex flex-1 gap-1.5">{scenes.map((item,n)=><Button key={n} variant="ghost" aria-label={`Cena ${n+1}`} aria-pressed={n===index} title={`Cena ${n+1}`} onClick={()=>setIndex(n)} className="mv-progress-control"><span className="mv-progress-track"><span key={`${index}-${n}`} className={`mv-progress-fill ${n<index?'mv-complete':n===index?'mv-running':''}`} style={{animationDuration:`${item.ms}ms`,animationPlayState:stopped?'paused':'running'}} /></span></Button>)}</div><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-secondary-foreground hover:bg-secondary-foreground/10" onClick={()=>setPaused(v=>!v)} title={paused?'Reproduzir animação':'Pausar animação'} aria-label={paused?'Reproduzir animação':'Pausar animação'}>{paused?<Play />:<Pause />}</Button></div>
 </section>;
}
