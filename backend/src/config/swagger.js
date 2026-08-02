import swaggerJsdoc from 'swagger-jsdoc';

/** OpenAPI 3 spec generated from JSDoc annotations in routes/controllers. */
export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Interior Estimation & Quotation Platform API',
      version: '0.1.0',
      description: 'REST API for the AI Interior Estimation & Quotation Platform.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['src/routes/*.js', 'src/adapters/http/routes/*.js'],
});

export default swaggerSpec;
