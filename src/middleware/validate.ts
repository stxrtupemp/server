import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects, z } from 'zod';

type ZodSchema = AnyZodObject | ZodEffects<AnyZodObject>;

interface RequestSchemas {
  body?:   ZodSchema;
  query?:  ZodSchema;
  params?: ZodSchema;
}

/**
 * Generic Zod validation middleware.
 * Validates req.body, req.query, and/or req.params against provided schemas.
 * On success, replaces the original values with the parsed (coerced) output.
 * On failure, passes a ZodError to the next error handler.
 *
 * Usage:
 *   router.post('/', validate({ body: createUserSchema }), handler)
 *   router.get('/',  validate({ query: paginationSchema }), handler)
 */
export function validate(schemas: RequestSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const combined: Record<string, unknown> = {};
      const shape: Record<string, ZodSchema>  = {};

      if (schemas.body)   shape['body']   = schemas.body;
      if (schemas.query)  shape['query']  = schemas.query;
      if (schemas.params) shape['params'] = schemas.params;

      const combinedSchema = z.object(shape);

      const source = {
        ...(schemas.body   !== undefined && { body:   req.body   }),
        ...(schemas.query  !== undefined && { query:  req.query  }),
        ...(schemas.params !== undefined && { params: req.params }),
      };

      const parsed = await combinedSchema.parseAsync(source);

      // Mutate req with parsed (coerced/stripped) values
      if (parsed['body']   !== undefined) req.body   = parsed['body'];
      if (parsed['query']  !== undefined) req.query  = parsed['query']  as typeof req.query;
      if (parsed['params'] !== undefined) req.params = parsed['params'] as typeof req.params;

      Object.assign(combined, parsed);

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Convenience wrapper — validates only req.body.
 */
export function validateBody(schema: ZodSchema) {
  return validate({ body: schema });
}

/**
 * Convenience wrapper — validates only req.query.
 */
export function validateQuery(schema: ZodSchema) {
  return validate({ query: schema });
}

/**
 * Convenience wrapper — validates only req.params.
 */
export function validateParams(schema: ZodSchema) {
  return validate({ params: schema });
}
