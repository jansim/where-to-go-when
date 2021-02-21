library(ncdf4) # package for netcdf manipulation
library(raster) # package for raster manipulation
library(rgdal) # package for geospatial analysis
library(ggplot2) # package for plotting
library(tidyverse)

months <- c(
  "Jan", "Feb", "Mar", "Apr", "May", "June",
  "July", "Aug", "Sep", "Oct", "Nov", "Dec"
)
months <- tolower(months)

nc_data <- nc_open('data/Complete_TAVG_EqualArea.nc')

print(nc_data)

lon <- ncvar_get(nc_data, "longitude")
lat <- ncvar_get(nc_data, "latitude")
time <- ncvar_get(nc_data, "time")

temp <- ncvar_get(nc_data, "temperature")
colnames(temp) <- time

climp <- ncvar_get(nc_data, "climatology")
colnames(climp) <- months

temp_last_year <- temp[,time > 2020 & time < 2021]
colnames(temp_last_year) <- months

abs_temp_last_year <- climp + temp_last_year

temperatures_last_year <- cbind(
  as.data.frame(abs_temp_last_year),
  data.frame(
    lat,
    lon
  )
)

write_csv(temperatures_last_year, file = "data/temp_2020.csv")

ggplot(temperatures_last_year) +
  geom_point(aes(x = lon, y = lat, color = jan))

ggplot(temperatures_last_year) +
  geom_point(aes(x = lon, y = lat, color = july))


jsonlite::write_json(temperatures_last_year, path = "web/static/data_cleaned/avg_temp_2020.json")

# Create spatial regions for temperature via H3 index
# remotes::install_github("crazycapivara/h3forr")
library(h3forr)

points <- temperatures_last_year %>% 
  sf::st_as_sf(coords = c("lon", "lat"), crs = 4326)
hex <- geo_to_h3(points, res = 2)

h3_to_geo_boundary(hex) %>% 
  geo_boundary_to_sf %>% 
  plot()

temp_h3 <- temperatures_last_year %>%
  select(-lat, -lon) %>%
  mutate(hex)

# Mean number of obs per bin
temp_h3 %>% count(hex) %>% pull(n) %>% mean()

hex_temp <- temp_h3 %>% 
  group_by(hex) %>% 
  summarise(across(everything(), ~ mean(.)))

ggplot(hex_temp$hex %>% h3_to_geo_boundary() %>% geo_boundary_to_sf()) +
  geom_sf(aes(fill = hex_temp$july))

ggplot(hex_temp$hex %>% h3_to_geo_boundary() %>% geo_boundary_to_sf()) +
  geom_sf(aes(fill = hex_temp$jan))

jsonlite::write_json(
  hex_temp,
  path = "web/static/data_cleaned/avg_temp_2020_h3.json"
)
