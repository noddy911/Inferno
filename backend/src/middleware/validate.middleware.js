import { z } from 'zod';
import { badRequest } from '../utils/AppError.js';

/**
 * Validate request body/query/params with a Zod schema.
 * Usage: validate({ body: schema }) — on success sets req.validated = { body, query, params }.
 */
export function validate({ body, query, params }) {
  const schema = z.object({
    body: body ?? z.record(z.unknown()),
    query: query ?? z.object({}),
    params: params ?? z.object({}),
  });

  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body ?? {},
      query: req.query ?? {},
      params: req.params ?? {},
    });

    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      return next(badRequest('Validation failed', errors));
    }

    req.validated = result.data;
    return next();
  };
}

export default validate;
