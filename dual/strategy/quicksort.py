from dual.strategy import Strategy

# in pseudocode

# function heapsort(array)
#     heapify(array, length(array))  // Build heap
#     end ← length(array) - 1
#     while end > 0
#         swap(array[end], array[0])  // Swap root with last element
#         end ← end - 1
#         siftDown(array, 0, end)  // Sift new root down
#     return array
#
# function heapify(array, count)
#     // (The binary tree has the root indexed at 0;
#     // the root of the heap is the minimum (or maximum) element)
#     start ← iParent(count-1)
#     while start ≥ 0
#         siftDown(array, start, count-1)
#         start ← start - 1
#     // After sifting down the root all nodes/elements are in heap order.
#
# function siftDown(array, start, end)
#     root ← start
#     while iLeftChild(root) ≤ end       // While the root has at least one child
#         child ← iLeftChild(root)   // Left child of root
#         swap ← root                // Keeps track of child to swap with
#         if array[swap] < array[child]
#             swap ← child
#         if child+1 ≤ end && array[swap] < array[child+1]
#             swap ← child + 1
#         if swap = root
#             // The root holds the largest element. Since we assume the heaps rooted at the
#             // children are valid, this means that we are done.
#             return
#         else
#             swap(array[root], array[swap])
#             root ← swap            // repeat to continue sifting down the child now
#
# function iParent(i)
#     return floor((i-1) / 2)
# function iLeftChild(i)
#     return 2*i + 1
# function iRightChild(i)
#     return 2*i + 2


def heap_sort(array):
    heapify(array, len(array))
    end = len(array) - 1
    while end > 0:
        array[end], array[0] = array[0], array[end]
        end -= 1
        sift_down(array, 0, end)
    return array


def heapify(array, count):
    start = i_parent(count - 1)
    while start >= 0:
        sift_down(array, start, count - 1)
        start -= 1


def sift_down(array, start, end):
    root = start
    while i_left_child(root) <= end:
        child = i_left_child(root)
        swap = root
        if array[swap] < array[child]:
            swap = child
        if child + 1 <= end and array[swap] < array[child + 1]:
            swap = child + 1
        if swap == root:
            return
        else:
            array[root], array[swap] = array[swap], array[root]
            root = swap


def i_parent(i):
    return (i - 1) // 2


def i_left_child(i):
    return 2 * i + 1


def i_right_child(i):
    return 2 * i + 2


class QuickSort(Strategy):
    def __init__(self, app):
        super().__init__('QuickSort', app)
