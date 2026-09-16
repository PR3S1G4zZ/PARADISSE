import { Router } from 'express';

export function createRoutingRouter({ resolver }) {
  const router = Router();

  router.post('/resolver', async (request, response, next) => {
    try {
      const route = await resolver(request.body);
      return response.json(route);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
