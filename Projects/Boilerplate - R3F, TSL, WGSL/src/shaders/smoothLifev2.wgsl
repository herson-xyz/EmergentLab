fn compute(
  cellStateIn: ptr<storage, array<f32>, read_write>,
  cellStateOut: ptr<storage, array<f32>, read_write>,
  cellGridCoords: ptr<storage, array<vec2u>, read_write>,
  index: u32,
  gridSize: u32,
  innerRadius: f32,
  outerRadius: f32,
  b1: f32,
  b2: f32,
  d1: f32,
  d2: f32
) -> void {
  let pos = (*cellGridCoords)[index];
  let dt: f32 = 0.3;

  // === Begin CalculateNeighbors (inlined) ===
  let cell = vec2f(pos);
  var innerKernelCellTotal: f32 = 0.0;
  var innerKernelStateSum: f32 = 0.0;
  var outerKernelCellTotal: f32 = 0.0;
  var outerKernelStateSum: f32 = 0.0;

  let r: i32 = i32(outerRadius);

  for (var x = -r; x <= r; x = x + 1) {
    for (var y = -r; y <= r; y = y + 1) {
      let neighborCell = cell + vec2f(f32(x), f32(y));
      let dist_from_center = length(cell - neighborCell);
      let logres: f32 = 4.0;
      let weight: f32 = 1.0 / (1.0 + exp(logres * (dist_from_center - outerRadius)));

      let wrappedX = (u32(cell.x) + u32(x) + gridSize) % gridSize;
      let wrappedY = (u32(cell.y) + u32(y) + gridSize) % gridSize;
      let ni = wrappedY * gridSize + wrappedX;
      let neighborState = (*cellStateIn)[ni];

      if (dist_from_center < innerRadius) {
        innerKernelCellTotal = innerKernelCellTotal + weight;
        innerKernelStateSum = innerKernelStateSum + (weight * neighborState);
      } else if (dist_from_center > innerRadius && dist_from_center <= outerRadius) {
        outerKernelCellTotal = outerKernelCellTotal + weight;
        outerKernelStateSum = outerKernelStateSum + (weight * neighborState);
      }
    }
  }

  let innerAvg = innerKernelStateSum / max(innerKernelCellTotal, 0.0001);
  let outerAvg = outerKernelStateSum / max(outerKernelCellTotal, 0.0001);
  // === End CalculateNeighbors ===

  // === Begin life_dynamics_function (inlined) ===
  let steepness: f32 = 0.001;

  let life_activation_inner = 1.0 / (1.0 + exp(-(innerAvg - 0.5) * (4.0 / steepness)));
  let adaptive1 = b1 * (1.0 - life_activation_inner) + d1 * life_activation_inner;
  let adaptive2 = b2 * (1.0 - life_activation_inner) + d2 * life_activation_inner;

  let life_activation_outer1 = 1.0 / (1.0 + exp(-(outerAvg - adaptive1) * (4.0 / steepness)));
  let life_activation_outer2 = 1.0 / (1.0 + exp(-(outerAvg - adaptive2) * (4.0 / steepness)));

  let rateOfChange = life_activation_outer1 * (1.0 - life_activation_outer2);
  // === End life_dynamics_function ===

  let currentState = (*cellStateIn)[index];
  let newCellState = currentState + dt * (rateOfChange - currentState);

  (*cellStateOut)[index] = newCellState;
}
