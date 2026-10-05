import {
  Armchair, Battery, Boxes, Cable, Camera, Clapperboard, Cpu, Drone, Film, Gamepad2,
  Headphones, HardDrive, Keyboard, Laptop, Lightbulb, Mic, Monitor, Mouse, Package,
  Plug, Printer, Projector, Radio, Router, Smartphone, Speaker, Tablet, Tv, Usb, Video,
  Wrench, type LucideIcon,
} from 'lucide-react';

/**
 * Ícones disponíveis para categorias. O nome é o que fica gravado no banco;
 * trocar a biblioteca de ícones só exige mudar este mapa.
 */
export const ICONES_CATEGORIA: Record<string, LucideIcon> = {
  camera: Camera, video: Video, film: Film, clapperboard: Clapperboard, mic: Mic,
  headphones: Headphones, speaker: Speaker, radio: Radio, lightbulb: Lightbulb,
  projector: Projector, monitor: Monitor, tv: Tv, laptop: Laptop, tablet: Tablet,
  smartphone: Smartphone, cpu: Cpu, 'hard-drive': HardDrive, keyboard: Keyboard,
  mouse: Mouse, printer: Printer, router: Router, cable: Cable, usb: Usb, plug: Plug,
  battery: Battery, drone: Drone, gamepad: Gamepad2, wrench: Wrench, armchair: Armchair,
  boxes: Boxes, package: Package,
};

export function IconeCategoria({
  nome,
  size = 20,
  className,
}: {
  nome?: string;
  size?: number;
  className?: string;
}) {
  const Icone = (nome && ICONES_CATEGORIA[nome]) || Package;
  return <Icone size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;
}

/** Paleta de cores sugeridas para categorias. Todas legíveis sobre o grafite. */
export const CORES_CATEGORIA = [
  '#7F77DD', '#5B8DEF', '#378ADD', '#1D9E75', '#5DCAA5', '#639922',
  '#EF9F27', '#D85A30', '#E24B4A', '#D4537E', '#888780', '#B4B2A9',
];
