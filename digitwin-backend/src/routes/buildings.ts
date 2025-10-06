// Building data API routes
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get buildings for a specific planning area
router.get('/:areaId', async (req, res) => {
  try {
    const { areaId } = req.params;

    const planningArea = await prisma.planningArea.findUnique({
      where: { id: areaId },
    });

    if (!planningArea) {
      return res.status(404).json({ error: 'Planning area not found' });
    }

    const buildings = await prisma.building.findMany({
      where: { planningAreaId: areaId },
      select: {
        footprint: true,
        height: true,
      },
    });

    res.json({
      planningArea: planningArea.name,
      id: areaId,
      buildingCount: buildings.length,
      buildings: buildings,
    });
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all planning areas (metadata only)
router.get('/', async (req, res) => {
  try {
    const areas = await prisma.planningArea.findMany({
      select: {
        id: true,
        name: true,
        region: true,
        centerLat: true,
        centerLng: true,
        _count: {
          select: {
            buildings: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(areas);
  } catch (error) {
    console.error('Error fetching planning areas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
