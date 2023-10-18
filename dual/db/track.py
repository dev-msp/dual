class Track:
    def __init__(self, row):
        self.row = row

    def __str__(self):
        return f"{self.row['title']} by {self.row['artist']}"
