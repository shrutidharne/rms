import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Review Management System (RMS) API',
      version: '1.0.0',
      description: 'API for managing property-level reviews',
      contact: {
        name: 'RMS Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Review: {
          type: 'object',
          required: ['property_id', 'user_name', 'overall_rating', 'body'],
          properties: {
            property_id: {
              type: 'string',
              format: 'uuid',
              description: 'The UUID of the property being reviewed'
            },
            user_name: {
              type: 'string',
              description: 'Name of the reviewer'
            },
            overall_rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              description: 'Overall rating (1-5)'
            },
            structured: {
              type: 'object',
              properties: {
                cleanliness: { type: 'integer', minimum: 1, maximum: 5 },
                comfort: { type: 'integer', minimum: 1, maximum: 5 },
                value_for_money: { type: 'integer', minimum: 1, maximum: 5 }
              },
              description: 'Structured ratings for specific aspects'
            },
            body: {
              type: 'string',
              minLength: 10,
              description: 'Review text (minimum 10 characters)'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'] // Path to the API routes
};

export const specs = swaggerJsdoc(options);