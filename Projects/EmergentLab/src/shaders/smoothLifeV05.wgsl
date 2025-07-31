@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellStateIn: array<f32>;
@group(0) @binding(2) var<storage, read_write> cellStateOut: array<f32>;

fn cellIndex(cell: vec2u) -> u32 {
  return cell.y * u32(grid.x) + cell.x;
}

@compute @workgroup_size(8, 8)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
  let i = cellIndex(cell.xy);
  if (cell.x >= u32(grid.x) || cell.y >= u32(grid.y)) {
    return;
  }

  let pos = cell.xy;
  let gridSize = u32(grid.x);

  var sumInner: f32 = 0.0;
  var sumOuter: f32 = 0.0;
  var countInner: f32 = 0.0;
  var countOuter: f32 = 0.0;

  // SmoothLife parameters - we'll make these uniforms later
  let innerRadius: f32 = 1.0;
  let outerRadius: f32 = 3.0;
  let B1: f32 = 0.278;
  let B2: f32 = 0.365;
  let D1: f32 = 0.278;
  let D2: f32 = 0.445;
  let M: f32 = 2.0;
  let alpha: f32 = 0.03;
  let beta: f32 = 0.07;

  let radius: i32 = i32(ceil(outerRadius));

  for (var dy: i32 = -radius; dy <= radius; dy = dy + 1) {
    for (var dx: i32 = -radius; dx <= radius; dx = dx + 1) {
      let wrappedX = ((i32(pos.x) + dx + i32(gridSize)) % i32(gridSize));
      let wrappedY = ((i32(pos.y) + dy + i32(gridSize)) % i32(gridSize));

      let ni = u32(wrappedY * i32(gridSize) + wrappedX);
      let neighborVal = cellStateIn[ni];

      let dist = sqrt(f32(dx * dx + dy * dy));
      let weight = 1.0 / (1.0 + exp(4.0 * (dist - outerRadius)));

      if (dist <= innerRadius) {
        sumInner = sumInner + weight * neighborVal;
        countInner = countInner + weight;
      } else if (dist <= outerRadius) {
        sumOuter = sumOuter + weight * neighborVal;
        countOuter = countOuter + weight;
      }
    }
  }

  let innerAvg = sumInner / max(countInner, 0.0001);
  let outerAvg = sumOuter / max(countOuter, 0.0001);

  let aliveness = 1.0 / (1.0 + exp(-4.0 / M * (innerAvg - 0.005)));
  let threshold1 = mix(B1, D1, aliveness);
  let threshold2 = mix(B2, D2, aliveness);

  let logistic_a = 1.0 / (1.0 + exp(-4.0 / beta * (outerAvg - threshold1)));
  let logistic_b = 1.0 / (1.0 + exp(-4.0 / beta * (outerAvg - threshold2)));
  let newAlive = logistic_a * (1.0 - logistic_b);
  let newVal = clamp(newAlive, 0.0, 1.0);

  cellStateOut[i] = newVal;
} 