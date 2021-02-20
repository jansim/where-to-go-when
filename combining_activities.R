library(tidyverse)
library(rjson)
library(jsonlite)

# loading datasets
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

mp_routes <- read_csv("data/mp_routes.csv")

ao <- read_json("data/ao.json", simplifyVector = TRUE)

# filtering activities
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
  filter(type %in% c("see", "do", "camping", "city")) %>%
  select(
    cat = type,
    lat, lon, title, phone, url
  )

wiki_final %>% 
  count(cat)

ggplot(wiki_final, aes(x = lon, y = lat, color = cat)) +
  geom_point()

#making columns that make sense to show as info
wiki_final$url[is.na(wiki_final$url)] <- " "
wiki_final$phone[is.na(wiki_final$phone)] <- " "

wiki_final$description <- paste(wiki_final$url,
                                "\n",
                                wiki_final$phone)


mp_routes$description <- paste("Difficulty:",
                               mp_routes$Rating
                               #, 
                               #". The type of the route is", 
                               #mp_routes$`Route Type`, ". It was rated with", 
                               #mp_routes$`Avg Stars`, " stars and a difficulty of",
                               #mp_routes$Rating, 
                               #". The route is appx.",
                               # mp_routes$Length, "long with around",
                               # mp_routes$Pitches, "pitches."
                               #, "Further descriptions include the following:",
                               #mp_routes$desc
)

final_mp <- mp_routes[,c(2,10,11,15)]

# renaming colums to match format
final_mp$lat <- final_mp$`Area Latitude`
final_mp$lon <- final_mp$`Area Longitude`
final_mp$cat <- "climbing"
final_mp$title <- final_mp$Route

final_mp <- final_mp[,c(4,5,6,7,8)]

#adding atlas obscura colums
ao$cat <- "ao"
ao$title <- ao$id
ao$description <- " "
ao$lon <- ao$lng

#combining data
combinedData <- rbind(wiki_final[,c(1,2,3,4,7)], final_mp, ao[,c(2,4,5,6,7)])

#saving data
write_csv(combinedData, "web/static/data_cleaned/combined_activities.csv")

