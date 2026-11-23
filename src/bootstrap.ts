import { startKoiIntro, showLoadError } from './lib/koi/intro'

// Start fetching the application while drawing the first fish.
void import('./main').catch(showLoadError)
if (document.documentElement.classList.contains('koi-loading')) startKoiIntro()
