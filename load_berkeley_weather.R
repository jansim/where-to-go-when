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

extract_temp_data <- function (type = 'TAVG', year = 2020) {
  nc_data <- nc_open(paste0('data/Complete_', type, '_EqualArea.nc'))
  
  print(nc_data)
  
  lon <- ncvar_get(nc_data, "longitude")
  lat <- ncvar_get(nc_data, "latitude")
  time <- ncvar_get(nc_data, "time")
  
  temp <- ncvar_get(nc_data, "temperature")
  colnames(temp) <- time
  
  climp <- ncvar_get(nc_data, "climatology")
  colnames(climp) <- months
  
  temp_last_year <- temp[,time > year & time < (year + 1)]
  colnames(temp_last_year) <- months
  
  abs_temp_last_year <- climp + temp_last_year
  
  temperatures_last_year <- cbind(
    as.data.frame(abs_temp_last_year),
    data.frame(
      lat,
      lon
    )
  )
  
  return(temperatures_last_year)
}

avg_temperatures_last_year <- extract_temp_data(type = "TAVG", year = 2019)
min_temperatures_last_year <- extract_temp_data(type = "TMIN", year = 2019)
max_temperatures_last_year <- extract_temp_data(type = "TMAX", year = 2019)

ggplot(avg_temperatures_last_year) +
  geom_point(aes(x = lon, y = lat, color = jan))

ggplot(avg_temperatures_last_year) +
  geom_point(aes(x = lon, y = lat, color = july))


jsonlite::write_json(avg_temperatures_last_year, path = "web/static/data_cleaned/avg_temp_2020.json")

# Create spatial regions for temperature via H3 index
# remotes::install_github("crazycapivara/h3forr")
library(h3forr)

hexify <- function (df) {
  points <- df %>% 
    sf::st_as_sf(coords = c("lon", "lat"), crs = 4326)
  hex <- geo_to_h3(points, res = 2)
  
  df %>%
    select(-lat, -lon) %>%
    mutate(hex) 
}

avg_temp_h3 <- hexify(avg_temperatures_last_year)
min_temp_h3 <- hexify(min_temperatures_last_year)
max_temp_h3 <- hexify(max_temperatures_last_year)

# Mean number of obs per bin
avg_temp_h3 %>% count(hex) %>% pull(n) %>% mean()

# Aggregate multiple hexagones toegether
avg_hex_temp <- avg_temp_h3 %>% 
  group_by(hex) %>% 
  summarise(across(everything(), ~ mean(.)))
min_hex_temp <- min_temp_h3 %>% 
  group_by(hex) %>% 
  summarise(across(everything(), ~ min(.))) %>% 
  mutate(across(where(is.numeric), ~ round(.)))
max_hex_temp <- max_temp_h3 %>% 
  group_by(hex) %>% 
  summarise(across(everything(), ~ max(.))) %>% 
  mutate(across(where(is.numeric), ~ round(.)))

hex_temp_all <- avg_hex_temp %>% 
  left_join(min_hex_temp %>% rename_at(vars(-hex), ~ paste0(., "_min")), by = "hex") %>% 
  left_join(max_hex_temp %>% rename_at(vars(-hex), ~ paste0(., "_max")), by = "hex")

ggplot(avg_hex_temp$hex %>% h3_to_geo_boundary() %>% geo_boundary_to_sf()) +
  geom_sf(aes(fill = avg_hex_temp$july))

ggplot(avg_hex_temp$hex %>% h3_to_geo_boundary() %>% geo_boundary_to_sf()) +
  geom_sf(aes(fill = avg_hex_temp$jan))

jsonlite::write_json(
  hex_temp_all,
  path = "web/static/data_cleaned/avg_temp_2020_h3.json"
)
