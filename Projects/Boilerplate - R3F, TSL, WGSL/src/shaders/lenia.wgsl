fn compute(
  cellStateIn: ptr<storage, array<f32>, read_write>,
  cellStateOut: ptr<storage, array<f32>, read_write>,
  cellGridCoords: ptr<storage, array<vec2u>, read_write>,
  index: u32,
  gridSize: u32,
  R: f32,
  T: f32,
  M: f32,
  S: f32
) -> void {
  let pos = (*cellGridCoords)[index];

  var neighborStateSum: f32 = 0.0;
  var kernelSum: f32 = 0.0;

  let radius: i32 = i32(R);

  for (var dx: i32 = -radius; dx <= radius; dx++) {
    for (var dy: i32 = -radius; dy <= radius; dy++) {
      let dist = sqrt(f32(dx * dx + dy * dy)) / R;
      if (dist >= 1.0) {
        continue;
      }
      let bellWeight = exp(-pow((dist - 0.5) / 0.15, 2.0) / 2.0);
      kernelSum = kernelSum + bellWeight;

      let wrappedX = (i32(pos.x) + dx + i32(gridSize)) % i32(gridSize);
      let wrappedY = (i32(pos.y) + dy + i32(gridSize)) % i32(gridSize);
      let ni = u32(wrappedY * i32(gridSize) + wrappedX);
      let neighborVal = (*cellStateIn)[ni];

      neighborStateSum = neighborStateSum + bellWeight * neighborVal;
    }
  }

  neighborStateSum = neighborStateSum / max(kernelSum, 0.0001);

  let currentVal = (*cellStateIn)[index];
  let g = exp(-pow((neighborStateSum - M) / S, 2.0) / 2.0) * 2.0 - 1.0;
  let newVal = clamp(currentVal + (1.0 / T) * g, 0.0, 1.0);

  (*cellStateOut)[index] = newVal;
}
