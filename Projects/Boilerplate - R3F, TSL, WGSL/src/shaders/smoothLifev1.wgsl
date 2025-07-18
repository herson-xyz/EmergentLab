fn compute(
    cellStateIn: ptr<storage, array<f32>, read_write>,
    cellStateOut: ptr<storage, array<f32>, read_write>,
    cellGridCoords: ptr<storage, array<vec2u>, read_write>,
    index: u32,
    gridSize: u32,
    innerRadius: f32,
    outerRadius: f32,
    B1: f32,
    B2: f32,
    D1: f32,
    D2: f32,
    M: f32,
    alpha: f32,
    beta: f32
  ) -> void {
    let pos = (*cellGridCoords)[index];

    var sumInner: f32 = 0.0;
    var sumOuter: f32 = 0.0;
    var countInner: f32 = 0.0;
    var countOuter: f32 = 0.0;

    let radius: i32 = i32(ceil(outerRadius));

    for (var dy: i32 = -radius; dy <= radius; dy = dy + 1) {
        for (var dx: i32 = -radius; dx <= radius; dx = dx + 1) {
            let wrappedX = ((i32(pos.x) + dx + i32(gridSize)) % i32(gridSize));
            let wrappedY = ((i32(pos.y) + dy + i32(gridSize)) % i32(gridSize));

            let ni = u32(wrappedY * i32(gridSize) + wrappedX);
            let neighborVal = (*cellStateIn)[ni];

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

    (*cellStateOut)[index] = newVal;
}