export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstField = Object.keys(errors)[0];
      const firstMessage = firstField ? `${firstField}: ${errors[firstField][0]}` : "Validation failed";

      return res.status(400).json({
        message: firstMessage,
        errors
      });
    }
    req.body = parsed.data;
    next();
  };
}
