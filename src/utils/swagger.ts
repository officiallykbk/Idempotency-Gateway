import { Application, Request, Response } from 'express';
import YAML from 'yamljs';
import fs from 'fs';
import path from 'path';
import { apiReference } from '@scalar/express-api-reference';
import swaggerUi from 'swagger-ui-express';
import lodash from 'lodash'
import { logger } from './logger';

export function setupSwagger(app: Application) {
  if (process.env.NODE_ENV === 'development') {
  const swaggerDir = path.join(__dirname, '../docs');
  let swaggerDocument: any = {};
  try {
    const files = fs.readdirSync(swaggerDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const file of files) {
      try {
        const doc = YAML.load(path.join(swaggerDir, file));
        swaggerDocument = lodash.merge({}, swaggerDocument, doc);
      } catch (err) {
        logger(`Failed to load swagger file ${file}:`, err);
      }
    }
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); 

    app.use(
      '/api-reference',
      apiReference({
        content: swaggerDocument,
      }),
    );
  } catch (err) {
    logger('Failed to read swagger directory:', err);
  }
}
}
