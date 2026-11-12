import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import { Jogo } from './Jogo';
import { Menu } from './ui/Menu';

document.getElementById('hud')!.style.visibility = 'hidden'; // aparece quando a peregrinação começa
const jogo = new Jogo(document.getElementById('jogo')!);
const menu = new Menu(
  (slot) => jogo.iniciarSlot(slot),
  () => jogo.config.abrir(),
);
jogo.aoVoltarAoTitulo = () => menu.mostrar();

jogo
  .carregar()
  .then(() => {
    document.getElementById('veu')!.style.opacity = '0';
    menu.pronto();
  })
  .catch((err) => {
    console.error(err);
    document.getElementById('bt-novo')!.textContent = 'Erro ao carregar (veja o console)';
  });

if (import.meta.env.DEV) (window as unknown as { jogo: Jogo }).jogo = jogo;
