import xarray as xr
import json
import os

# Load dataset
ds = xr.open_dataset("data/tracerData_MASKED_year1990.nc")

# Output directory
output_dir = "data/"
os.makedirs(output_dir, exist_ok=True)

# Tracers
tracer_names = ['dyeBering', 'dyeBarents', 'dyeFram', 'dyeDavis', 'dyeFuryHecla']

# Subsample
step = 10

# Loop over all 12 months (time points 0 to 11)
for time_index in range(12):
    subset = ds.isel(Time=time_index, nCells=slice(0, None, step))
    lon = subset.lonCell.values.tolist()
    lat = subset.latCell.values.tolist()
    
    result = []
    for tracer in tracer_names:
        values = subset[tracer].values.tolist()
        result += [{
            "lon": lon[i],
            "lat": lat[i],
            "value": values[i],
            "tracer": tracer
        } for i in range(len(lon))]

    # Save as a JSON file
    with open(os.path.join(output_dir, f"time{time_index}.json"), "w") as f:
        json.dump(result, f)
