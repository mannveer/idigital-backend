import { IStorageService } from './IStorageService';
import { LocalStorageService } from './LocalStorageService';
import config from '../../config';

export * from './IStorageService';

let storageService: IStorageService;

export function getStorageService(): IStorageService {
  if (!storageService) {
    switch (config.storage.provider) {
      case 'local':
      default:
        storageService = new LocalStorageService();
        break;
    }
  }
  return storageService;
}

export const storage = getStorageService(); 