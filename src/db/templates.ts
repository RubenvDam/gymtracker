/** Ready-made plans a profile can start from. Exercise ids refer to public/exercises.json. */
export interface TemplateItem {
  /** First id is the default; the rest are alternatives (e.g. machine / dumbbell / cable). */
  ids: string[]
  sets: number
  reps: [number, number]
  note?: string
}

export interface TemplateRoutine {
  key: string
  name: string
  label: string
  items: TemplateItem[]
}

export interface PlanTemplate {
  id: string
  name: string
  description: string
  routines: TemplateRoutine[]
  /** Monday … Sunday: routine key or null for rest. */
  schedule: (string | null)[]
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'upper-lower-4',
    name: 'Upper / Lower · 4 days',
    description: 'A days focus on weight (strength), B days on reps (volume). Mon Lower A, Tue Upper A, Thu Lower B, Fri Upper B.',
    schedule: ['LA', 'UA', null, 'LB', 'UB', null, null],
    routines: [
      {
        key: 'LA',
        name: 'Lower A',
        label: 'Strength',
        items: [
          { ids: ['Barbell_Squat'], sets: 4, reps: [5, 5] },
          { ids: ['Romanian_Deadlift'], sets: 4, reps: [6, 6] },
          { ids: ['extra-bulgarian-split-squat'], sets: 3, reps: [8, 8], note: 'each leg' },
          { ids: ['Leg_Press'], sets: 3, reps: [8, 8], note: 'decline' },
          { ids: ['Seated_Calf_Raise'], sets: 4, reps: [10, 10] },
          { ids: ['Flat_Bench_Lying_Leg_Raise', 'Hanging_Leg_Raise'], sets: 3, reps: [12, 12] },
          { ids: ['Pallof_Press'], sets: 3, reps: [10, 10], note: 'each side' },
        ],
      },
      {
        key: 'UA',
        name: 'Upper A',
        label: 'Strength',
        items: [
          { ids: ['Barbell_Bench_Press_-_Medium_Grip'], sets: 4, reps: [5, 5] },
          { ids: ['Bent_Over_Barbell_Row'], sets: 4, reps: [5, 5] },
          { ids: ['Standing_Military_Press'], sets: 3, reps: [6, 6] },
          { ids: ['Pullups'], sets: 3, reps: [6, 6], note: 'weighted' },
          { ids: ['Incline_Dumbbell_Press'], sets: 3, reps: [8, 8] },
          { ids: ['Face_Pull'], sets: 3, reps: [12, 12] },
          { ids: ['Barbell_Curl'], sets: 2, reps: [8, 8] },
          { ids: ['Dips_-_Triceps_Version'], sets: 2, reps: [8, 8], note: 'weighted' },
        ],
      },
      {
        key: 'LB',
        name: 'Lower B',
        label: 'Volume',
        items: [
          { ids: ['Leg_Press'], sets: 4, reps: [12, 12] },
          { ids: ['extra-dumbbell-romanian-deadlift'], sets: 3, reps: [12, 12] },
          { ids: ['Dumbbell_Lunges', 'Barbell_Walking_Lunge', 'Bodyweight_Walking_Lunge'], sets: 3, reps: [12, 12], note: 'walking, each leg' },
          { ids: ['Lying_Leg_Curls', 'Seated_Leg_Curl'], sets: 3, reps: [12, 12] },
          { ids: ['Leg_Extensions'], sets: 3, reps: [15, 15] },
          { ids: ['Seated_Calf_Raise'], sets: 4, reps: [15, 15] },
          { ids: ['Standing_Cable_Wood_Chop'], sets: 3, reps: [12, 12], note: 'each side' },
          { ids: ['Cable_Crunch'], sets: 3, reps: [10, 10] },
        ],
      },
      {
        key: 'UB',
        name: 'Upper B',
        label: 'Volume',
        items: [
          { ids: ['Dumbbell_Bench_Press'], sets: 4, reps: [10, 10] },
          { ids: ['Seated_Cable_Rows'], sets: 4, reps: [10, 10] },
          { ids: ['Side_Lateral_Raise', 'Cable_Seated_Lateral_Raise'], sets: 3, reps: [15, 15] },
          { ids: ['Wide-Grip_Lat_Pulldown'], sets: 3, reps: [12, 12] },
          { ids: ['Cable_Crossover', 'Butterfly', 'Dumbbell_Flyes'], sets: 3, reps: [12, 12] },
          { ids: ['Reverse_Machine_Flyes', 'Reverse_Flyes', 'Cable_Rear_Delt_Fly'], sets: 3, reps: [15, 15] },
          { ids: ['Incline_Dumbbell_Curl'], sets: 3, reps: [12, 12] },
          { ids: ['Cable_Rope_Overhead_Triceps_Extension'], sets: 3, reps: [12, 12] },
        ],
      },
    ],
  },
]
