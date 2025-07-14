fn compute(
    cellStateIn: ptr<storage, array<f32>, read_write>,
    cellStateOut: ptr<storage, array<f32>, read_write>,
    cellGridCoords: ptr<storage, array<vec2u>, read_write>,
    index: u32,
    gridSize: u32
  ) -> void {
    // Simple passthrough for now — read input, write to output
    (*cellStateOut)[index] = (*cellStateIn)[index];
}