# ==============================
# A COMPREHENSIVE PYTHON EXAMPLE
# ==============================

# 1. VARIABLES AND BASIC DATA TYPES
print("=== 1. Variables and Basic Types ===")
name = "Alice"          # String
age = 30                # Integer
height = 1.75           # Float
is_programmer = True    # Boolean
favorite_language = None # NoneType

print(f"Name: {name}, Type: {type(name)}")
print(f"Age: {age}, Type: {type(age)}")
print(f"Height: {height}, Type: {type(height)}")
print(f"Is Programmer: {is_programmer}, Type: {type(is_programmer)}")
print(f"Favorite Language: {favorite_language}, Type: {type(favorite_language)}")
print()

# 2. LISTS AND TUPLES
print("=== 2. Lists and Tuples ===")
# List - Mutable
fruits_list = ["apple", "banana", "cherry"]
fruits_list.append("orange")
fruits_list[0] = "avocado"
print("List (mutable):", fruits_list)

# Tuple - Immutable
fruits_tuple = ("apple", "banana", "cherry")
# fruits_tuple[0] = "avocado" # This would cause an error!
print("Tuple (immutable):", fruits_tuple)
print()

# 3. DICTIONARIES
print("=== 3. Dictionaries ===")
person = {
    "name": "Bob",
    "age": 25,
    "city": "New York",
    "hobbies": ["reading", "hiking", "coding"]
}
print("Original dict:", person)
person["job"] = "Developer" # Add a new key-value pair
print("Age from dict:", person["age"])
print("Updated dict:", person)
print()

# 4. CONTROL FLOW (if/elif/else)
print("=== 4. Control Flow ===")
temperature = 18
if temperature > 30:
    print("It's hot outside. Stay hydrated!")
elif 20 <= temperature <= 30:
    print("It's a perfect day!")
else:
    print("It's a bit chilly. Bring a jacket.")
print()

# 5. LOOPS (for and while)
print("=== 5. Loops ===")
print("For loop over list:")
for index, fruit in enumerate(fruits_list): # enumerate gives index and value
    print(f"  {index}: {fruit}")

print("\nWhile loop:")
countdown = 3
while countdown > 0:
    print(f"  Countdown: {countdown}")
    countdown -= 1
print("  Blast off!")
print()

# 6. FUNCTIONS
print("=== 6. Functions ===")
def calculate_area(length, width=1):
    """Calculates the area of a rectangle or square."""
    area = length * width
    return area

# Using the function
square_area = calculate_area(5)
rectangle_area = calculate_area(4, 6)
print(f"Area of square (side 5): {square_area}")
print(f"Area of rectangle (4x6): {rectangle_area}")
print()

# 7. LIST COMPREHENSIONS
print("=== 7. List Comprehensions ===")
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
# Create a list of squares for even numbers only
even_squares = [x**2 for x in numbers if x % 2 == 0]
print("Original numbers:", numbers)
print("Squares of evens:", even_squares)
print()

# 8. FILE HANDLING
print("=== 8. File Handling ===")
filename = "sample_data.txt"
# Write to a file
try:
    with open(filename, 'w') as file:
        file.write("Hello, File World!\n")
        file.write("This is line 2.\n")
        file.write("And this is line 3.\n")
    print(f"Successfully wrote to {filename}")

    # Read from the same file
    with open(filename, 'r') as file:
        content = file.read()
    print(f"Contents of {filename}:")
    print(content)

except IOError as e:
    print(f"An error occurred with the file: {e}")
print()

# 9. ERROR HANDLING
print("=== 9. Error Handling ===")
def safe_divide(a, b):
    try:
        result = a / b
        print(f"{a} / {b} = {result}")
    except ZeroDivisionError:
        print("Error: You can't divide by zero!")
    except TypeError:
        print("Error: Please provide numbers!")
    else:
        print("Division performed successfully!")
    finally:
        print("This 'finally' block always runs.\n")

# Test the function
safe_divide(10, 2)
safe_divide(10, 0)
safe_divide(10, 'a') # This will cause a TypeError
print()

# 10. CLASSES AND OBJECTS (OOP)
print("=== 10. Classes and Objects ===")
class Book:
    # Class Attribute (shared by all instances)
    library_name = "Python Public Library"

    # Constructor
    def __init__(self, title, author, pages):
        # Instance Attributes (unique to each object)
        self.title = title
        self.author = author
        self.pages = pages
        self.is_checked_out = False

    # Instance Method
    def check_out(self):
        if not self.is_checked_out:
            self.is_checked_out = True
            return f"'{self.title}' has been checked out."
        else:
            return f"Sorry, '{self.title}' is already checked out."

    # Another Method
    def book_info(self):
        status = "Checked Out" if self.is_checked_out else "Available"
        return f"'{self.title}' by {self.author}. {self.pages} pages. Status: {status}"

# Create objects (instances of the Book class)
book1 = Book("The Pythonic Way", "A. Developer", 350)
book2 = Book("Data Science Essentials", "B. Analyst", 275)

# Use the objects and their methods
print(book1.book_info())
print(book2.check_out())
print(book2.check_out()) # Try to check it out again
print(f"Both books are at the {Book.library_name}")
print()

# 11. USING EXTERNAL MODULES
print("=== 11. Using External Modules ===")
# We'll simulate common imports. (Uncomment the real imports to use them)
# import math
# from datetime import datetime

# Simulating the output without actually importing
print("Simulating module usage:")
print("math.sqrt(16) would return: 4.0")
#print(math.sqrqt(16)) # Uncomment this if you have the math module
print("Current datetime would be:", "2023-10-27 14:30:00") 
#print(datetime.now()) # Uncomment this if you want the real time

print("\n" + "="*50)
print("Program finished successfully!")


# ==============================
# A COMPREHENSIVE PYTHON EXAMPLE
# ==============================

# 1. VARIABLES AND BASIC DATA TYPES
print("=== 1. Variables and Basic Types ===")
name = "Alice"          # String
age = 30                # Integer
height = 1.75           # Float
is_programmer = True    # Boolean
favorite_language = None # NoneType

print(f"Name: {name}, Type: {type(name)}")
print(f"Age: {age}, Type: {type(age)}")
print(f"Height: {height}, Type: {type(height)}")
print(f"Is Programmer: {is_programmer}, Type: {type(is_programmer)}")
print(f"Favorite Language: {favorite_language}, Type: {type(favorite_language)}")
print()

# 2. LISTS AND TUPLES
print("=== 2. Lists and Tuples ===")
# List - Mutable
fruits_list = ["apple", "banana", "cherry"]
fruits_list.append("orange")
fruits_list[0] = "avocado"
print("List (mutable):", fruits_list)

# Tuple - Immutable
fruits_tuple = ("apple", "banana", "cherry")
# fruits_tuple[0] = "avocado" # This would cause an error!
print("Tuple (immutable):", fruits_tuple)
print()

# 3. DICTIONARIES
print("=== 3. Dictionaries ===")
person = {
    "name": "Bob",
    "age": 25,
    "city": "New York",
    "hobbies": ["reading", "hiking", "coding"]
}
print("Original dict:", person)
person["job"] = "Developer" # Add a new key-value pair
print("Age from dict:", person["age"])
print("Updated dict:", person)
print()

# 4. CONTROL FLOW (if/elif/else)
print("=== 4. Control Flow ===")
temperature = 18
if temperature > 30:
    print("It's hot outside. Stay hydrated!")
elif 20 <= temperature <= 30:
    print("It's a perfect day!")
else:
    print("It's a bit chilly. Bring a jacket.")
print()

# 5. LOOPS (for and while)
print("=== 5. Loops ===")
print("For loop over list:")
for index, fruit in enumerate(fruits_list): # enumerate gives index and value
    print(f"  {index}: {fruit}")

print("\nWhile loop:")
countdown = 3
while countdown > 0:
    print(f"  Countdown: {countdown}")
    countdown -= 1
print("  Blast off!")
print()

# 6. FUNCTIONS
print("=== 6. Functions ===")
def calculate_area(length, width=1):
    """Calculates the area of a rectangle or square."""
    area = length * width
    return area

# Using the function
square_area = calculate_area(5)
rectangle_area = calculate_area(4, 6)
print(f"Area of square (side 5): {square_area}")
print(f"Area of rectangle (4x6): {rectangle_area}")
print()

# 7. LIST COMPREHENSIONS
print("=== 7. List Comprehensions ===")
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
# Create a list of squares for even numbers only
even_squares = [x**2 for x in numbers if x % 2 == 0]
print("Original numbers:", numbers)
print("Squares of evens:", even_squares)
print()

# 8. FILE HANDLING
print("=== 8. File Handling ===")
filename = "sample_data.txt"
# Write to a file
try:
    with open(filename, 'w') as file:
        file.write("Hello, File World!\n")
        file.write("This is line 2.\n")
        file.write("And this is line 3.\n")
    print(f"Successfully wrote to {filename}")

    # Read from the same file
    with open(filename, 'r') as file:
        content = file.read()
    print(f"Contents of {filename}:")
    print(content)

except IOError as e:
    print(f"An error occurred with the file: {e}")
print()

# 9. ERROR HANDLING
print("=== 9. Error Handling ===")
def safe_divide(a, b):
    try:
        result = a / b
        print(f"{a} / {b} = {result}")
    except ZeroDivisionError:
        print("Error: You can't divide by zero!")
    except TypeError:
        print("Error: Please provide numbers!")
    else:
        print("Division performed successfully!")
    finally:
        print("This 'finally' block always runs.\n")

# Test the function
safe_divide(10, 2)
safe_divide(10, 0)
safe_divide(10, 'a') # This will cause a TypeError
print()

# 10. CLASSES AND OBJECTS (OOP)
print("=== 10. Classes and Objects ===")
class Book:
    # Class Attribute (shared by all instances)
    library_name = "Python Public Library"

    # Constructor
    def __init__(self, title, author, pages):
        # Instance Attributes (unique to each object)
        self.title = title
        self.author = author
        self.pages = pages
        self.is_checked_out = False

    # Instance Method
    def check_out(self):
        if not self.is_checked_out:
            self.is_checked_out = True
            return f"'{self.title}' has been checked out."
        else:
            return f"Sorry, '{self.title}' is already checked out."

    # Another Method
    def book_info(self):
        status = "Checked Out" if self.is_checked_out else "Available"
        return f"'{self.title}' by {self.author}. {self.pages} pages. Status: {status}"

# Create objects (instances of the Book class)
book1 = Book("The Pythonic Way", "A. Developer", 350)
book2 = Book("Data Science Essentials", "B. Analyst", 275)

# Use the objects and their methods
print(book1.book_info())
print(book2.check_out())
print(book2.check_out()) # Try to check it out again
print(f"Both books are at the {Book.library_name}")
print()

# 11. USING EXTERNAL MODULES
print("=== 11. Using External Modules ===")
# We'll simulate common imports. (Uncomment the real imports to use them)
# import math
# from datetime import datetime

# Simulating the output without actually importing
print("Simulating module usage:")
print("math.sqrt(16) would return: 4.0")
#print(math.sqrqt(16)) # Uncomment this if you have the math module
print("Current datetime would be:", "2023-10-27 14:30:00") 
#print(datetime.now()) # Uncomment this if you want the real time

print("\n" + "="*50)
print("Program finished successfully!")


# ==============================
# A COMPREHENSIVE PYTHON EXAMPLE
# ==============================

# 1. VARIABLES AND BASIC DATA TYPES
print("=== 1. Variables and Basic Types ===")
name = "Alice"          # String
age = 30                # Integer
height = 1.75           # Float
is_programmer = True    # Boolean
favorite_language = None # NoneType

print(f"Name: {name}, Type: {type(name)}")
print(f"Age: {age}, Type: {type(age)}")
print(f"Height: {height}, Type: {type(height)}")
print(f"Is Programmer: {is_programmer}, Type: {type(is_programmer)}")
print(f"Favorite Language: {favorite_language}, Type: {type(favorite_language)}")
print()

# 2. LISTS AND TUPLES
print("=== 2. Lists and Tuples ===")
# List - Mutable
fruits_list = ["apple", "banana", "cherry"]
fruits_list.append("orange")
fruits_list[0] = "avocado"
print("List (mutable):", fruits_list)

# Tuple - Immutable
fruits_tuple = ("apple", "banana", "cherry")
# fruits_tuple[0] = "avocado" # This would cause an error!
print("Tuple (immutable):", fruits_tuple)
print()

# 3. DICTIONARIES
print("=== 3. Dictionaries ===")
person = {
    "name": "Bob",
    "age": 25,
    "city": "New York",
    "hobbies": ["reading", "hiking", "coding"]
}
print("Original dict:", person)
person["job"] = "Developer" # Add a new key-value pair
print("Age from dict:", person["age"])
print("Updated dict:", person)
print()

# 4. CONTROL FLOW (if/elif/else)
print("=== 4. Control Flow ===")
temperature = 18
if temperature > 30:
    print("It's hot outside. Stay hydrated!")
elif 20 <= temperature <= 30:
    print("It's a perfect day!")
else:
    print("It's a bit chilly. Bring a jacket.")
print()

# 5. LOOPS (for and while)
print("=== 5. Loops ===")
print("For loop over list:")
for index, fruit in enumerate(fruits_list): # enumerate gives index and value
    print(f"  {index}: {fruit}")

print("\nWhile loop:")
countdown = 3
while countdown > 0:
    print(f"  Countdown: {countdown}")
    countdown -= 1
print("  Blast off!")
print()

# 6. FUNCTIONS
print("=== 6. Functions ===")
def calculate_area(length, width=1):
    """Calculates the area of a rectangle or square."""
    area = length * width
    return area

# Using the function
square_area = calculate_area(5)
rectangle_area = calculate_area(4, 6)
print(f"Area of square (side 5): {square_area}")
print(f"Area of rectangle (4x6): {rectangle_area}")
print()

# 7. LIST COMPREHENSIONS
print("=== 7. List Comprehensions ===")
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
# Create a list of squares for even numbers only
even_squares = [x**2 for x in numbers if x % 2 == 0]
print("Original numbers:", numbers)
print("Squares of evens:", even_squares)
print()

# 8. FILE HANDLING
print("=== 8. File Handling ===")
filename = "sample_data.txt"
# Write to a file
try:
    with open(filename, 'w') as file:
        file.write("Hello, File World!\n")
        file.write("This is line 2.\n")
        file.write("And this is line 3.\n")
    print(f"Successfully wrote to {filename}")

    # Read from the same file
    with open(filename, 'r') as file:
        content = file.read()
    print(f"Contents of {filename}:")
    print(content)

except IOError as e:
    print(f"An error occurred with the file: {e}")
print()

# 9. ERROR HANDLING
print("=== 9. Error Handling ===")
def safe_divide(a, b):
    try:
        result = a / b
        print(f"{a} / {b} = {result}")
    except ZeroDivisionError:
        print("Error: You can't divide by zero!")
    except TypeError:
        print("Error: Please provide numbers!")
    else:
        print("Division performed successfully!")
    finally:
        print("This 'finally' block always runs.\n")

# Test the function
safe_divide(10, 2)
safe_divide(10, 0)
safe_divide(10, 'a') # This will cause a TypeError
print()

# 10. CLASSES AND OBJECTS (OOP)
print("=== 10. Classes and Objects ===")
class Book:
    # Class Attribute (shared by all instances)
    library_name = "Python Public Library"

    # Constructor
    def __init__(self, title, author, pages):
        # Instance Attributes (unique to each object)
        self.title = title
        self.author = author
        self.pages = pages
        self.is_checked_out = False

    # Instance Method
    def check_out(self):
        if not self.is_checked_out:
            self.is_checked_out = True
            return f"'{self.title}' has been checked out."
        else:
            return f"Sorry, '{self.title}' is already checked out."

    # Another Method
    def book_info(self):
        status = "Checked Out" if self.is_checked_out else "Available"
        return f"'{self.title}' by {self.author}. {self.pages} pages. Status: {status}"

# Create objects (instances of the Book class)
book1 = Book("The Pythonic Way", "A. Developer", 350)
book2 = Book("Data Science Essentials", "B. Analyst", 275)

# Use the objects and their methods
print(book1.book_info())
print(book2.check_out())
print(book2.check_out()) # Try to check it out again
print(f"Both books are at the {Book.library_name}")
print()

# 11. USING EXTERNAL MODULES
print("=== 11. Using External Modules ===")
# We'll simulate common imports. (Uncomment the real imports to use them)
# import math
# from datetime import datetime

# Simulating the output without actually importing
print("Simulating module usage:")
print("math.sqrt(16) would return: 4.0")
#print(math.sqrqt(16)) # Uncomment this if you have the math module
print("Current datetime would be:", "2023-10-27 14:30:00") 
#print(datetime.now()) # Uncomment this if you want the real time

print("\n" + "="*50)
print("Program finished successfully!")


# ==============================
# A COMPREHENSIVE PYTHON EXAMPLE
# ==============================

# 1. VARIABLES AND BASIC DATA TYPES
print("=== 1. Variables and Basic Types ===")
name = "Alice"          # String
age = 30                # Integer
height = 1.75           # Float
is_programmer = True    # Boolean
favorite_language = None # NoneType

print(f"Name: {name}, Type: {type(name)}")
print(f"Age: {age}, Type: {type(age)}")
print(f"Height: {height}, Type: {type(height)}")
print(f"Is Programmer: {is_programmer}, Type: {type(is_programmer)}")
print(f"Favorite Language: {favorite_language}, Type: {type(favorite_language)}")
print()

# 2. LISTS AND TUPLES
print("=== 2. Lists and Tuples ===")
# List - Mutable
fruits_list = ["apple", "banana", "cherry"]
fruits_list.append("orange")
fruits_list[0] = "avocado"
print("List (mutable):", fruits_list)

# Tuple - Immutable
fruits_tuple = ("apple", "banana", "cherry")
# fruits_tuple[0] = "avocado" # This would cause an error!
print("Tuple (immutable):", fruits_tuple)
print()

# 3. DICTIONARIES
print("=== 3. Dictionaries ===")
person = {
    "name": "Bob",
    "age": 25,
    "city": "New York",
    "hobbies": ["reading", "hiking", "coding"]
}
print("Original dict:", person)
person["job"] = "Developer" # Add a new key-value pair
print("Age from dict:", person["age"])
print("Updated dict:", person)
print()

# 4. CONTROL FLOW (if/elif/else)
print("=== 4. Control Flow ===")
temperature = 18
if temperature > 30:
    print("It's hot outside. Stay hydrated!")
elif 20 <= temperature <= 30:
    print("It's a perfect day!")
else:
    print("It's a bit chilly. Bring a jacket.")
print()

# 5. LOOPS (for and while)
print("=== 5. Loops ===")
print("For loop over list:")
for index, fruit in enumerate(fruits_list): # enumerate gives index and value
    print(f"  {index}: {fruit}")

print("\nWhile loop:")
countdown = 3
while countdown > 0:
    print(f"  Countdown: {countdown}")
    countdown -= 1
print("  Blast off!")
print()

# 6. FUNCTIONS
print("=== 6. Functions ===")
def calculate_area(length, width=1):
    """Calculates the area of a rectangle or square."""
    area = length * width
    return area

# Using the function
square_area = calculate_area(5)
rectangle_area = calculate_area(4, 6)
print(f"Area of square (side 5): {square_area}")
print(f"Area of rectangle (4x6): {rectangle_area}")
print()

# 7. LIST COMPREHENSIONS
print("=== 7. List Comprehensions ===")
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
# Create a list of squares for even numbers only
even_squares = [x**2 for x in numbers if x % 2 == 0]
print("Original numbers:", numbers)
print("Squares of evens:", even_squares)
print()

# 8. FILE HANDLING
print("=== 8. File Handling ===")
filename = "sample_data.txt"
# Write to a file
try:
    with open(filename, 'w') as file:
        file.write("Hello, File World!\n")
        file.write("This is line 2.\n")
        file.write("And this is line 3.\n")
    print(f"Successfully wrote to {filename}")

    # Read from the same file
    with open(filename, 'r') as file:
        content = file.read()
    print(f"Contents of {filename}:")
    print(content)

except IOError as e:
    print(f"An error occurred with the file: {e}")
print()

# 9. ERROR HANDLING
print("=== 9. Error Handling ===")
def safe_divide(a, b):
    try:
        result = a / b
        print(f"{a} / {b} = {result}")
    except ZeroDivisionError:
        print("Error: You can't divide by zero!")
    except TypeError:
        print("Error: Please provide numbers!")
    else:
        print("Division performed successfully!")
    finally:
        print("This 'finally' block always runs.\n")

# Test the function
safe_divide(10, 2)
safe_divide(10, 0)
safe_divide(10, 'a') # This will cause a TypeError
print()

# 10. CLASSES AND OBJECTS (OOP)
print("=== 10. Classes and Objects ===")
class Book:
    # Class Attribute (shared by all instances)
    library_name = "Python Public Library"

    # Constructor
    def __init__(self, title, author, pages):
        # Instance Attributes (unique to each object)
        self.title = title
        self.author = author
        self.pages = pages
        self.is_checked_out = False

    # Instance Method
    def check_out(self):
        if not self.is_checked_out:
            self.is_checked_out = True
            return f"'{self.title}' has been checked out."
        else:
            return f"Sorry, '{self.title}' is already checked out."

    # Another Method
    def book_info(self):
        status = "Checked Out" if self.is_checked_out else "Available"
        return f"'{self.title}' by {self.author}. {self.pages} pages. Status: {status}"

# Create objects (instances of the Book class)
book1 = Book("The Pythonic Way", "A. Developer", 350)
book2 = Book("Data Science Essentials", "B. Analyst", 275)

# Use the objects and their methods
print(book1.book_info())
print(book2.check_out())
print(book2.check_out()) # Try to check it out again
print(f"Both books are at the {Book.library_name}")
print()

# 11. USING EXTERNAL MODULES
print("=== 11. Using External Modules ===")
# We'll simulate common imports. (Uncomment the real imports to use them)
# import math
# from datetime import datetime

# Simulating the output without actually importing
print("Simulating module usage:")
print("math.sqrt(16) would return: 4.0")
#print(math.sqrqt(16)) # Uncomment this if you have the math module
print("Current datetime would be:", "2023-10-27 14:30:00") 
#print(datetime.now()) # Uncomment this if you want the real time

print("\n" + "="*50)
print("Program finished successfully!")


# ==============================
# A COMPREHENSIVE PYTHON EXAMPLE
# ==============================

# 1. VARIABLES AND BASIC DATA TYPES
print("=== 1. Variables and Basic Types ===")
name = "Alice"          # String
age = 30                # Integer
height = 1.75           # Float
is_programmer = True    # Boolean
favorite_language = None # NoneType

print(f"Name: {name}, Type: {type(name)}")
print(f"Age: {age}, Type: {type(age)}")
print(f"Height: {height}, Type: {type(height)}")
print(f"Is Programmer: {is_programmer}, Type: {type(is_programmer)}")
print(f"Favorite Language: {favorite_language}, Type: {type(favorite_language)}")
print()

# 2. LISTS AND TUPLES
print("=== 2. Lists and Tuples ===")
# List - Mutable
fruits_list = ["apple", "banana", "cherry"]
fruits_list.append("orange")
fruits_list[0] = "avocado"
print("List (mutable):", fruits_list)

# Tuple - Immutable
fruits_tuple = ("apple", "banana", "cherry")
# fruits_tuple[0] = "avocado" # This would cause an error!
print("Tuple (immutable):", fruits_tuple)
print()

# 3. DICTIONARIES
print("=== 3. Dictionaries ===")
person = {
    "name": "Bob",
    "age": 25,
    "city": "New York",
    "hobbies": ["reading", "hiking", "coding"]
}
print("Original dict:", person)
person["job"] = "Developer" # Add a new key-value pair
print("Age from dict:", person["age"])
print("Updated dict:", person)
print()

# 4. CONTROL FLOW (if/elif/else)
print("=== 4. Control Flow ===")
temperature = 18
if temperature > 30:
    print("It's hot outside. Stay hydrated!")
elif 20 <= temperature <= 30:
    print("It's a perfect day!")
else:
    print("It's a bit chilly. Bring a jacket.")
print()

# 5. LOOPS (for and while)
print("=== 5. Loops ===")
print("For loop over list:")
for index, fruit in enumerate(fruits_list): # enumerate gives index and value
    print(f"  {index}: {fruit}")

print("\nWhile loop:")
countdown = 3
while countdown > 0:
    print(f"  Countdown: {countdown}")
    countdown -= 1
print("  Blast off!")
print()

# 6. FUNCTIONS
print("=== 6. Functions ===")
def calculate_area(length, width=1):
    """Calculates the area of a rectangle or square."""
    area = length * width
    return area

# Using the function
square_area = calculate_area(5)
rectangle_area = calculate_area(4, 6)
print(f"Area of square (side 5): {square_area}")
print(f"Area of rectangle (4x6): {rectangle_area}")
print()

# 7. LIST COMPREHENSIONS
print("=== 7. List Comprehensions ===")
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
# Create a list of squares for even numbers only
even_squares = [x**2 for x in numbers if x % 2 == 0]
print("Original numbers:", numbers)
print("Squares of evens:", even_squares)
print()

# 8. FILE HANDLING
print("=== 8. File Handling ===")
filename = "sample_data.txt"
# Write to a file
try:
    with open(filename, 'w') as file:
        file.write("Hello, File World!\n")
        file.write("This is line 2.\n")
        file.write("And this is line 3.\n")
    print(f"Successfully wrote to {filename}")

    # Read from the same file
    with open(filename, 'r') as file:
        content = file.read()
    print(f"Contents of {filename}:")
    print(content)

except IOError as e:
    print(f"An error occurred with the file: {e}")
print()

# 9. ERROR HANDLING
print("=== 9. Error Handling ===")
def safe_divide(a, b):
    try:
        result = a / b
        print(f"{a} / {b} = {result}")
    except ZeroDivisionError:
        print("Error: You can't divide by zero!")
    except TypeError:
        print("Error: Please provide numbers!")
    else:
        print("Division performed successfully!")
    finally:
        print("This 'finally' block always runs.\n")

# Test the function
safe_divide(10, 2)
safe_divide(10, 0)
safe_divide(10, 'a') # This will cause a TypeError
print()

# 10. CLASSES AND OBJECTS (OOP)
print("=== 10. Classes and Objects ===")
class Book:
    # Class Attribute (shared by all instances)
    library_name = "Python Public Library"

    # Constructor
    def __init__(self, title, author, pages):
        # Instance Attributes (unique to each object)
        self.title = title
        self.author = author
        self.pages = pages
        self.is_checked_out = False

    # Instance Method
    def check_out(self):
        if not self.is_checked_out:
            self.is_checked_out = True
            return f"'{self.title}' has been checked out."
        else:
            return f"Sorry, '{self.title}' is already checked out."

    # Another Method
    def book_info(self):
        status = "Checked Out" if self.is_checked_out else "Available"
        return f"'{self.title}' by {self.author}. {self.pages} pages. Status: {status}"

# Create objects (instances of the Book class)
book1 = Book("The Pythonic Way", "A. Developer", 350)
book2 = Book("Data Science Essentials", "B. Analyst", 275)

# Use the objects and their methods
print(book1.book_info())
print(book2.check_out())
print(book2.check_out()) # Try to check it out again
print(f"Both books are at the {Book.library_name}")
print()

# 11. USING EXTERNAL MODULES
print("=== 11. Using External Modules ===")
# We'll simulate common imports. (Uncomment the real imports to use them)
# import math
# from datetime import datetime

# Simulating the output without actually importing
print("Simulating module usage:")
print("math.sqrt(16) would return: 4.0")
#print(math.sqrqt(16)) # Uncomment this if you have the math module
print("Current datetime would be:", "2023-10-27 14:30:00") 
#print(datetime.now()) # Uncomment this if you want the real time

print("\n" + "="*50)
print("Program finished successfully!")


# ==============================
# A COMPREHENSIVE PYTHON EXAMPLE
# ==============================

# 1. VARIABLES AND BASIC DATA TYPES
print("=== 1. Variables and Basic Types ===")
name = "Alice"          # String
age = 30                # Integer
height = 1.75           # Float
is_programmer = True    # Boolean
favorite_language = None # NoneType

print(f"Name: {name}, Type: {type(name)}")
print(f"Age: {age}, Type: {type(age)}")
print(f"Height: {height}, Type: {type(height)}")
print(f"Is Programmer: {is_programmer}, Type: {type(is_programmer)}")
print(f"Favorite Language: {favorite_language}, Type: {type(favorite_language)}")
print()

# 2. LISTS AND TUPLES
print("=== 2. Lists and Tuples ===")
# List - Mutable
fruits_list = ["apple", "banana", "cherry"]
fruits_list.append("orange")
fruits_list[0] = "avocado"
print("List (mutable):", fruits_list)

# Tuple - Immutable
fruits_tuple = ("apple", "banana", "cherry")
# fruits_tuple[0] = "avocado" # This would cause an error!
print("Tuple (immutable):", fruits_tuple)
print()

# 3. DICTIONARIES
print("=== 3. Dictionaries ===")
person = {
    "name": "Bob",
    "age": 25,
    "city": "New York",
    "hobbies": ["reading", "hiking", "coding"]
}
print("Original dict:", person)
person["job"] = "Developer" # Add a new key-value pair
print("Age from dict:", person["age"])
print("Updated dict:", person)
print()

# 4. CONTROL FLOW (if/elif/else)
print("=== 4. Control Flow ===")
temperature = 18
if temperature > 30:
    print("It's hot outside. Stay hydrated!")
elif 20 <= temperature <= 30:
    print("It's a perfect day!")
else:
    print("It's a bit chilly. Bring a jacket.")
print()

# 5. LOOPS (for and while)
print("=== 5. Loops ===")
print("For loop over list:")
for index, fruit in enumerate(fruits_list): # enumerate gives index and value
    print(f"  {index}: {fruit}")

print("\nWhile loop:")
countdown = 3
while countdown > 0:
    print(f"  Countdown: {countdown}")
    countdown -= 1
print("  Blast off!")
print()

# 6. FUNCTIONS
print("=== 6. Functions ===")
def calculate_area(length, width=1):
    """Calculates the area of a rectangle or square."""
    area = length * width
    return area

# Using the function
square_area = calculate_area(5)
rectangle_area = calculate_area(4, 6)
print(f"Area of square (side 5): {square_area}")
print(f"Area of rectangle (4x6): {rectangle_area}")
print()

# 7. LIST COMPREHENSIONS
print("=== 7. List Comprehensions ===")
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
# Create a list of squares for even numbers only
even_squares = [x**2 for x in numbers if x % 2 == 0]
print("Original numbers:", numbers)
print("Squares of evens:", even_squares)
print()

# 8. FILE HANDLING
print("=== 8. File Handling ===")
filename = "sample_data.txt"
# Write to a file
try:
    with open(filename, 'w') as file:
        file.write("Hello, File World!\n")
        file.write("This is line 2.\n")
        file.write("And this is line 3.\n")
    print(f"Successfully wrote to {filename}")

    # Read from the same file
    with open(filename, 'r') as file:
        content = file.read()
    print(f"Contents of {filename}:")
    print(content)

except IOError as e:
    print(f"An error occurred with the file: {e}")
print()

# 9. ERROR HANDLING
print("=== 9. Error Handling ===")
def safe_divide(a, b):
    try:
        result = a / b
        print(f"{a} / {b} = {result}")
    except ZeroDivisionError:
        print("Error: You can't divide by zero!")
    except TypeError:
        print("Error: Please provide numbers!")
    else:
        print("Division performed successfully!")
    finally:
        print("This 'finally' block always runs.\n")

# Test the function
safe_divide(10, 2)
safe_divide(10, 0)
safe_divide(10, 'a') # This will cause a TypeError
print()

# 10. CLASSES AND OBJECTS (OOP)
print("=== 10. Classes and Objects ===")
class Book:
    # Class Attribute (shared by all instances)
    library_name = "Python Public Library"

    # Constructor
    def __init__(self, title, author, pages):
        # Instance Attributes (unique to each object)
        self.title = title
        self.author = author
        self.pages = pages
        self.is_checked_out = False

    # Instance Method
    def check_out(self):
        if not self.is_checked_out:
            self.is_checked_out = True
            return f"'{self.title}' has been checked out."
        else:
            return f"Sorry, '{self.title}' is already checked out."

    # Another Method
    def book_info(self):
        status = "Checked Out" if self.is_checked_out else "Available"
        return f"'{self.title}' by {self.author}. {self.pages} pages. Status: {status}"

# Create objects (instances of the Book class)
book1 = Book("The Pythonic Way", "A. Developer", 350)
book2 = Book("Data Science Essentials", "B. Analyst", 275)

# Use the objects and their methods
print(book1.book_info())
print(book2.check_out())
print(book2.check_out()) # Try to check it out again
print(f"Both books are at the {Book.library_name}")
print()

# 11. USING EXTERNAL MODULES
print("=== 11. Using External Modules ===")
# We'll simulate common imports. (Uncomment the real imports to use them)
# import math
# from datetime import datetime

# Simulating the output without actually importing
print("Simulating module usage:")
print("math.sqrt(16) would return: 4.0")
#print(math.sqrqt(16)) # Uncomment this if you have the math module
print("Current datetime would be:", "2023-10-27 14:30:00") 
#print(datetime.now()) # Uncomment this if you want the real time

print("\n" + "="*50)
print("Program finished successfully!")


# ==============================
# A COMPREHENSIVE PYTHON EXAMPLE
# ==============================

# 1. VARIABLES AND BASIC DATA TYPES
print("=== 1. Variables and Basic Types ===")
name = "Alice"          # String
age = 30                # Integer
height = 1.75           # Float
is_programmer = True    # Boolean
favorite_language = None # NoneType

print(f"Name: {name}, Type: {type(name)}")
print(f"Age: {age}, Type: {type(age)}")
print(f"Height: {height}, Type: {type(height)}")
print(f"Is Programmer: {is_programmer}, Type: {type(is_programmer)}")
print(f"Favorite Language: {favorite_language}, Type: {type(favorite_language)}")
print()

# 2. LISTS AND TUPLES
print("=== 2. Lists and Tuples ===")
# List - Mutable
fruits_list = ["apple", "banana", "cherry"]
fruits_list.append("orange")
fruits_list[0] = "avocado"
print("List (mutable):", fruits_list)

# Tuple - Immutable
fruits_tuple = ("apple", "banana", "cherry")
# fruits_tuple[0] = "avocado" # This would cause an error!
print("Tuple (immutable):", fruits_tuple)
print()

# 3. DICTIONARIES
print("=== 3. Dictionaries ===")
person = {
    "name": "Bob",
    "age": 25,
    "city": "New York",
    "hobbies": ["reading", "hiking", "coding"]
}
print("Original dict:", person)
person["job"] = "Developer" # Add a new key-value pair
print("Age from dict:", person["age"])
print("Updated dict:", person)
print()

# 4. CONTROL FLOW (if/elif/else)
print("=== 4. Control Flow ===")
temperature = 18
if temperature > 30:
    print("It's hot outside. Stay hydrated!")
elif 20 <= temperature <= 30:
    print("It's a perfect day!")
else:
    print("It's a bit chilly. Bring a jacket.")
print()

# 5. LOOPS (for and while)
print("=== 5. Loops ===")
print("For loop over list:")
for index, fruit in enumerate(fruits_list): # enumerate gives index and value
    print(f"  {index}: {fruit}")

print("\nWhile loop:")
countdown = 3
while countdown > 0:
    print(f"  Countdown: {countdown}")
    countdown -= 1
print("  Blast off!")
print()

# 6. FUNCTIONS
print("=== 6. Functions ===")
def calculate_area(length, width=1):
    """Calculates the area of a rectangle or square."""
    area = length * width
    return area

# Using the function
square_area = calculate_area(5)
rectangle_area = calculate_area(4, 6)
print(f"Area of square (side 5): {square_area}")
print(f"Area of rectangle (4x6): {rectangle_area}")
print()

# 7. LIST COMPREHENSIONS
print("=== 7. List Comprehensions ===")
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
# Create a list of squares for even numbers only
even_squares = [x**2 for x in numbers if x % 2 == 0]
print("Original numbers:", numbers)
print("Squares of evens:", even_squares)
print()

# 8. FILE HANDLING
print("=== 8. File Handling ===")
filename = "sample_data.txt"
# Write to a file
try:
    with open(filename, 'w') as file:
        file.write("Hello, File World!\n")
        file.write("This is line 2.\n")
        file.write("And this is line 3.\n")
    print(f"Successfully wrote to {filename}")

    # Read from the same file
    with open(filename, 'r') as file:
        content = file.read()
    print(f"Contents of {filename}:")
    print(content)

except IOError as e:
    print(f"An error occurred with the file: {e}")
print()

# 9. ERROR HANDLING
print("=== 9. Error Handling ===")
def safe_divide(a, b):
    try:
        result = a / b
        print(f"{a} / {b} = {result}")
    except ZeroDivisionError:
        print("Error: You can't divide by zero!")
    except TypeError:
        print("Error: Please provide numbers!")
    else:
        print("Division performed successfully!")
    finally:
        print("This 'finally' block always runs.\n")

# Test the function
safe_divide(10, 2)
safe_divide(10, 0)
safe_divide(10, 'a') # This will cause a TypeError
print()

# 10. CLASSES AND OBJECTS (OOP)
print("=== 10. Classes and Objects ===")
class Book:
    # Class Attribute (shared by all instances)
    library_name = "Python Public Library"

    # Constructor
    def __init__(self, title, author, pages):
        # Instance Attributes (unique to each object)
        self.title = title
        self.author = author
        self.pages = pages
        self.is_checked_out = False

    # Instance Method
    def check_out(self):
        if not self.is_checked_out:
            self.is_checked_out = True
            return f"'{self.title}' has been checked out."
        else:
            return f"Sorry, '{self.title}' is already checked out."

    # Another Method
    def book_info(self):
        status = "Checked Out" if self.is_checked_out else "Available"
        return f"'{self.title}' by {self.author}. {self.pages} pages. Status: {status}"

# Create objects (instances of the Book class)
book1 = Book("The Pythonic Way", "A. Developer", 350)
book2 = Book("Data Science Essentials", "B. Analyst", 275)

# Use the objects and their methods
print(book1.book_info())
print(book2.check_out())
print(book2.check_out()) # Try to check it out again
print(f"Both books are at the {Book.library_name}")
print()

# 11. USING EXTERNAL MODULES
print("=== 11. Using External Modules ===")
# We'll simulate common imports. (Uncomment the real imports to use them)
# import math
# from datetime import datetime

# Simulating the output without actually importing
print("Simulating module usage:")
print("math.sqrt(16) would return: 4.0")
#print(math.sqrqt(16)) # Uncomment this if you have the math module
print("Current datetime would be:", "2023-10-27 14:30:00") 
#print(datetime.now()) # Uncomment this if you want the real time

print("\n" + "="*50)
print("Program finished successfully!")

# ==============================
# A COMPREHENSIVE PYTHON EXAMPLE
# ==============================

# 1. VARIABLES AND BASIC DATA TYPES
print("=== 1. Variables and Basic Types ===")
name = "Alice"          # String
age = 30                # Integer
height = 1.75           # Float
is_programmer = True    # Boolean
favorite_language = None # NoneType

print(f"Name: {name}, Type: {type(name)}")
print(f"Age: {age}, Type: {type(age)}")
print(f"Height: {height}, Type: {type(height)}")
print(f"Is Programmer: {is_programmer}, Type: {type(is_programmer)}")
print(f"Favorite Language: {favorite_language}, Type: {type(favorite_language)}")
print()

# 2. LISTS AND TUPLES
print("=== 2. Lists and Tuples ===")
# List - Mutable
fruits_list = ["apple", "banana", "cherry"]
fruits_list.append("orange")
fruits_list[0] = "avocado"
print("List (mutable):", fruits_list)

# Tuple - Immutable
fruits_tuple = ("apple", "banana", "cherry")
# fruits_tuple[0] = "avocado" # This would cause an error!
print("Tuple (immutable):", fruits_tuple)
print()

# 3. DICTIONARIES
print("=== 3. Dictionaries ===")
person = {
    "name": "Bob",
    "age": 25,
    "city": "New York",
    "hobbies": ["reading", "hiking", "coding"]
}
print("Original dict:", person)
person["job"] = "Developer" # Add a new key-value pair
print("Age from dict:", person["age"])
print("Updated dict:", person)
print()

# 4. CONTROL FLOW (if/elif/else)
print("=== 4. Control Flow ===")
temperature = 18
if temperature > 30:
    print("It's hot outside. Stay hydrated!")
elif 20 <= temperature <= 30:
    print("It's a perfect day!")
else:
    print("It's a bit chilly. Bring a jacket.")
print()

# 5. LOOPS (for and while)
print("=== 5. Loops ===")
print("For loop over list:")
for index, fruit in enumerate(fruits_list): # enumerate gives index and value
    print(f"  {index}: {fruit}")

print("\nWhile loop:")
countdown = 3
while countdown > 0:
    print(f"  Countdown: {countdown}")
    countdown -= 1
print("  Blast off!")
print()

# 6. FUNCTIONS
print("=== 6. Functions ===")
def calculate_area(length, width=1):
    """Calculates the area of a rectangle or square."""
    area = length * width
    return area

# Using the function
square_area = calculate_area(5)
rectangle_area = calculate_area(4, 6)
print(f"Area of square (side 5): {square_area}")
print(f"Area of rectangle (4x6): {rectangle_area}")
print()

# 7. LIST COMPREHENSIONS
print("=== 7. List Comprehensions ===")
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
# Create a list of squares for even numbers only
even_squares = [x**2 for x in numbers if x % 2 == 0]
print("Original numbers:", numbers)
print("Squares of evens:", even_squares)
print()

# 8. FILE HANDLING
print("=== 8. File Handling ===")
filename = "sample_data.txt"
# Write to a file
try:
    with open(filename, 'w') as file:
        file.write("Hello, File World!\n")
        file.write("This is line 2.\n")
        file.write("And this is line 3.\n")
    print(f"Successfully wrote to {filename}")

    # Read from the same file
    with open(filename, 'r') as file:
        content = file.read()
    print(f"Contents of {filename}:")
    print(content)

except IOError as e:
    print(f"An error occurred with the file: {e}")
print()

# 9. ERROR HANDLING
print("=== 9. Error Handling ===")
def safe_divide(a, b):
    try:
        result = a / b
        print(f"{a} / {b} = {result}")
    except ZeroDivisionError:
        print("Error: You can't divide by zero!")
    except TypeError:
        print("Error: Please provide numbers!")
    else:
        print("Division performed successfully!")
    finally:
        print("This 'finally' block always runs.\n")

# Test the function
safe_divide(10, 2)
safe_divide(10, 0)
safe_divide(10, 'a') # This will cause a TypeError
print()

# 10. CLASSES AND OBJECTS (OOP)
print("=== 10. Classes and Objects ===")
class Book:
    # Class Attribute (shared by all instances)
    library_name = "Python Public Library"

    # Constructor
    def __init__(self, title, author, pages):
        # Instance Attributes (unique to each object)
        self.title = title
        self.author = author
        self.pages = pages
        self.is_checked_out = False

    # Instance Method
    def check_out(self):
        if not self.is_checked_out:
            self.is_checked_out = True
            return f"'{self.title}' has been checked out."
        else:
            return f"Sorry, '{self.title}' is already checked out."

    # Another Method
    def book_info(self):
        status = "Checked Out" if self.is_checked_out else "Available"
        return f"'{self.title}' by {self.author}. {self.pages} pages. Status: {status}"

# Create objects (instances of the Book class)
book1 = Book("The Pythonic Way", "A. Developer", 350)
book2 = Book("Data Science Essentials", "B. Analyst", 275)

# Use the objects and their methods
print(book1.book_info())
print(book2.check_out())
print(book2.check_out()) # Try to check it out again
print(f"Both books are at the {Book.library_name}")
print()

# 11. USING EXTERNAL MODULES
print("=== 11. Using External Modules ===")
# We'll simulate common imports. (Uncomment the real imports to use them)
# import math
# from datetime import datetime

# Simulating the output without actually importing
print("Simulating module usage:")
print("math.sqrt(16) would return: 4.0")
#print(math.sqrqt(16)) # Uncomment this if you have the math module
print("Current datetime would be:", "2023-10-27 14:30:00") 
#print(datetime.now()) # Uncomment this if you want the real time

print("\n" + "="*50)
print("Program finished successfully!")
