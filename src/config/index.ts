import yaml from 'js-yaml';
import fs from 'fs';

export const loadConfig = (path: string) => {
  return yaml.load(fs.readFileSync(path, 'utf8'));
};
