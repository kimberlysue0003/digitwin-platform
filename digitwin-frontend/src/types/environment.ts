// Environment data types from NEA API

export interface WeatherStation {
  station_id: string;
  device_id?: string;
  name?: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface TemperatureReading {
  station_id: string;
  value: number; // Celsius
}

export interface WindReading {
  station_id: string;
  speed: number; // knots
  direction: number; // degrees 0-360
}

export interface RainfallReading {
  station_id: string;
  value: number; // mm
}

export interface PollutionReading {
  region: 'north' | 'south' | 'east' | 'west' | 'central';
  pm25: number;
  psi: number;
}

export interface EnvironmentData {
  timestamp: string;
  temperature?: {
    stations: WeatherStation[];
    readings: TemperatureReading[];
  };
  wind?: {
    stations: WeatherStation[];
    speed: WindReading[];
    direction: WindReading[];
  };
  rainfall?: {
    stations: WeatherStation[];
    readings: RainfallReading[];
  };
  pollution?: {
    pm25: PollutionReading[];
    psi: PollutionReading[];
  };
}
