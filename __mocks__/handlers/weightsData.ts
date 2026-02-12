// __mocks__/handlers/weightsData.ts

export let weights = [
  {
    id: "1",
    weightKg: 70,
    note: "Morning weigh-in",
    createdAt: "2023-10-01T00:00:00Z",
  },
  {
    id: "2",
    weightKg: 69.9, // Consistent with weightGetWeightsHandler
    note: "Evening weigh-in",
    createdAt: "2023-10-02T00:00:00Z",
  },
];

export const resetWeights = () => {
  weights = [
    {
      id: "1",
      weightKg: 70,
      note: "Morning weigh-in",
      createdAt: "2023-10-01T00:00:00Z",
    },
    {
      id: "2",
      weightKg: 69.9,
      note: "Evening weigh-in",
      createdAt: "2023-10-02T00:00:00Z",
    },
  ];
};
