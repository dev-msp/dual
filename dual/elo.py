def predict(a, b, k):
    return 1 / (1 + 10 ** ((b - a) / k))


def new_score(a, b, score, k=2):
    if not a or not b:
        k = 2
    a = a or b or 1000
    b = b or a
    expected = predict(a, b, k)
    delta = k * (score - expected)
    return a + delta, b - delta
