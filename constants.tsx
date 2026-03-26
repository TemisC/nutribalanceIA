
import { UserRole, ProgressLog } from './types';

export const MOCK_USER = {
  id: 'user_123',
  name: 'Alex Rivera',
  email: 'alex@example.com',
  role: UserRole.PRO,
  tokens: 250,
  biometrics: {
    weight: 82,
    height: 180,
    age: 28,
    gender: 'male' as const,
    goal: 'muscle_gain' as const,
    activityLevel: 'active' as const,
  }
};

export const MOCK_PROGRESS_DATA: ProgressLog[] = [
  { date: '2024-05-01', weight: 85.0, caloriesConsumed: 2100, measurements: { weight: 85.0, waist: 98, chest: 105, hips: 100, neck: 40 } },
  { date: '2024-05-05', weight: 84.5, caloriesConsumed: 2050, measurements: { weight: 84.5, waist: 97.5, chest: 104.5, hips: 99.5, neck: 39.8 } },
  { date: '2024-05-10', weight: 84.2, caloriesConsumed: 2200, measurements: { weight: 84.2, waist: 97, chest: 104, hips: 99, neck: 39.5 } },
  { date: '2024-05-15', weight: 83.8, caloriesConsumed: 1950, measurements: { weight: 83.8, waist: 96.5, chest: 103, hips: 98.5, neck: 39.2 } },
  { date: '2024-05-20', weight: 83.1, caloriesConsumed: 2000, measurements: { weight: 83.1, waist: 95.8, chest: 102.5, hips: 98, neck: 39.0 } },
  { date: '2024-05-25', weight: 82.5, caloriesConsumed: 2100, measurements: { weight: 82.5, waist: 95, chest: 102, hips: 97.5, neck: 38.8 } },
  { date: '2024-05-30', weight: 82.0, caloriesConsumed: 2050, measurements: { weight: 82.0, waist: 94.5, chest: 101.5, hips: 97, neck: 38.5 } },
];
