library(tidyverse)

wiki <- read_csv(
  "data/wikivoyage-listings-en-latest.csv",
  col_types = cols(
      .default = col_character(),
      wikipedia = col_logical(),
      latitude = col_double(),
      longitude = col_double(),
      wifi = col_logical(),
      accessibility = col_logical(),
      lastEdit = col_character()
    )
) %>%
  rename(
    lat = latitude,
    lon = longitude
  )

wiki <- wiki %>%
  filter(!is.na(lat), !is.na(lon)) %>%
  filter(abs(lon) < 180, abs(lat) < 90)

is_camping <- (
  str_detect(wiki$title, "camping|campground") |
  str_detect(wiki$email, "camping|campground") |
  str_detect(wiki$url, "camping|campground")
  ) %>% replace_na(FALSE)
wiki[is_camping,]$type <- "camping"

wiki %>%
  count(type)

wiki_final <- wiki %>%
  filter(type %in% c("see", "do", "camping", "city", "go")) %>%
  select(
    cat = type,
    lat, lon, title, phone, url
  )

wiki_final %>% 
  count(cat)

ggplot(wiki_final, aes(x = lon, y = lat, color = cat)) +
  geom_point()

jsonlite::write_json(wiki_final, path = "data_cleaned/wiki_voyage.json")
write_csv(wiki_final, "web/data_cleaned/wiki_voyage.csv")
