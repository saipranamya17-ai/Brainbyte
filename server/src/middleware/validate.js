import { ZodError } from 'zod';

/**
 * Returns an Express middleware that validates req.body against the given Zod schema.
 * On failure returns 400 with field-level errors.
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.') || 'root';
          fields[key] = issue.message;
        }
        return res.status(400).json({
          error: { message: 'Validation failed', code: 'VALIDATION_ERROR', fields },
        });
      }
      next(err);
    }
  };
}
