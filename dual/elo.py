def predict(a, b, k):
    return 1 / (1 + 10 ** ((b - a) / k))


def new_score(a, b, score, k=4):
    expected = predict(a, b, k)
    delta = k * (score - expected)
    return a + delta, b - delta
