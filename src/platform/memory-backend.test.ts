// Memory backend (T008): must satisfy the shared SaveStore contract.
import { createMemoryBackend } from './memory-backend'
import { runSaveStoreContract } from './save-store.contract'

runSaveStoreContract('memory', () => createMemoryBackend())
