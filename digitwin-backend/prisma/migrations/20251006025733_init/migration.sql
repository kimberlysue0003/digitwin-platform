-- CreateTable
CREATE TABLE "PlanningArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "boundsMinLat" DOUBLE PRECISION NOT NULL,
    "boundsMinLng" DOUBLE PRECISION NOT NULL,
    "boundsMaxLat" DOUBLE PRECISION NOT NULL,
    "boundsMaxLng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" SERIAL NOT NULL,
    "planningAreaId" TEXT NOT NULL,
    "footprint" JSONB NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "buildingType" TEXT,
    "levels" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'OpenStreetMap',
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WindStreamline" (
    "id" SERIAL NOT NULL,
    "planningAreaId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "points" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WindStreamline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapTexture" (
    "id" SERIAL NOT NULL,
    "planningAreaId" TEXT NOT NULL,
    "pngFilePath" TEXT NOT NULL,
    "boundsMinLat" DOUBLE PRECISION NOT NULL,
    "boundsMinLng" DOUBLE PRECISION NOT NULL,
    "boundsMaxLat" DOUBLE PRECISION NOT NULL,
    "boundsMaxLng" DOUBLE PRECISION NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "zoom" INTEGER NOT NULL DEFAULT 14,
    "width" INTEGER NOT NULL DEFAULT 2048,
    "height" INTEGER NOT NULL DEFAULT 2048,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapTexture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherStation" (
    "id" SERIAL NOT NULL,
    "stationId" TEXT NOT NULL,
    "stationName" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "stationType" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeatherStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollutionRegion" (
    "id" SERIAL NOT NULL,
    "regionName" TEXT NOT NULL,
    "boundaryGeoJson" JSONB NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollutionRegion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanningArea_region_idx" ON "PlanningArea"("region");

-- CreateIndex
CREATE INDEX "Building_planningAreaId_idx" ON "Building"("planningAreaId");

-- CreateIndex
CREATE INDEX "WindStreamline_planningAreaId_direction_idx" ON "WindStreamline"("planningAreaId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "MapTexture_planningAreaId_key" ON "MapTexture"("planningAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherStation_stationId_key" ON "WeatherStation"("stationId");

-- CreateIndex
CREATE INDEX "WeatherStation_stationId_idx" ON "WeatherStation"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "PollutionRegion_regionName_key" ON "PollutionRegion"("regionName");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_planningAreaId_fkey" FOREIGN KEY ("planningAreaId") REFERENCES "PlanningArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WindStreamline" ADD CONSTRAINT "WindStreamline_planningAreaId_fkey" FOREIGN KEY ("planningAreaId") REFERENCES "PlanningArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapTexture" ADD CONSTRAINT "MapTexture_planningAreaId_fkey" FOREIGN KEY ("planningAreaId") REFERENCES "PlanningArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
