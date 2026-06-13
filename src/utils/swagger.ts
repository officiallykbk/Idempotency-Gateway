import { Application, Request, Response } from 'express';
import { merge, isErrorResult } from 'openapi-merge';
import YAML from 'yamljs';
import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { apiReference } from '@scalar/express-api-reference';
import { logger } from './logger';

export function setupSwagger(app: Application) {
  logger('Swagger setup initialized');
}
