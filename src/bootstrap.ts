import { showLoadError } from './lib/load-error'
import { enterFishRoute } from './lib/koi/route'

void import('./main').catch(showLoadError)
if (document.documentElement.classList.contains('koi-loading')) void enterFishRoute().catch(showLoadError)
