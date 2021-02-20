## cleaningMPRoutes

mp_routes <- read_csv("data/mp_routes.csv")
View(mp_routes)

plot(mp_routes$`Area Longitude`, mp_routes$`Area Latitude`)



# eine spalte mit description

mp_routes$description <- paste("The name of the climbing route is",
                                   mp_routes$Route
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

final_mp <- mp_routes[,c(10,11,15)]

# renaming colums to match format
final_mp$lat <- final_mp$`Area Latitude`
final_mp$lon <- final_mp$`Area Longitude`

final_mp <- final_mp[,c(3,4,5)]

jsonlite::write_json(final_mp, path = "data_cleaned/ClimbingRoutes.json")


