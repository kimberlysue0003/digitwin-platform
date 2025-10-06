// Map texture metadata API routes
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get map texture metadata for a specific planning area
router.get('/:areaId', async (req, res) => {
  try {
    const { areaId } = req.params;

    const mapTexture = await prisma.mapTexture.findUnique({
      where: { planningAreaId: areaId },
      include: {
        planningArea: {
          select: {
            name: true,
            region: true,
          },
        },
      },
    });

    if (!mapTexture) {
      return res.status(404).json({ error: 'Map texture not found' });
    }

    // Return in same format as frontend expects
    res.json({
      bounds: [
        [mapTexture.boundsMinLat, mapTexture.boundsMinLng],
        [mapTexture.boundsMaxLat, mapTexture.boundsMaxLng],
      ],
      center: [mapTexture.centerLat, mapTexture.centerLng],
      zoom: mapTexture.zoom,
      size: [mapTexture.width, mapTexture.height],
      name: mapTexture.planningArea.name,
      region: mapTexture.planningArea.region.toUpperCase(),
      pngUrl: `/static/${mapTexture.pngFilePath}`,
    });
  } catch (error) {
    console.error('Error fetching map texture:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
