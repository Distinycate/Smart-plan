import { CurriculumProvider } from './types';
import { LegacyCurriculumAdapter } from './legacyDataAdapter';

let defaultProviderInstance: CurriculumProvider | null = null;

export function getCurriculumProvider(): CurriculumProvider {
  if (!defaultProviderInstance) {
    defaultProviderInstance = new LegacyCurriculumAdapter();
  }
  return defaultProviderInstance;
}
