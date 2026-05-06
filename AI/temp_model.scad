
// RAKEEZ OS - PARAMETRIC TURBINE
$fn = 60;

module blade() {
    translate([12.5, 0, 0])
    square([25.0, 2], center=true);
}

module turbine_profile() {
    union() {
        circle(r = 6.25); // Central hub
        for(i = [0 : 6]) {
            rotate(i * 360 / 7)
            blade();
        }
    }
}

linear_extrude(height = 40.0, twist = 60.0, slices = 100, center = true)
turbine_profile();
