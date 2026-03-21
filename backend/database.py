import mysql.connector
from mysql.connector import Error

def get_db_connection():
    """
    Establishes a connection to the MySQL Workbench database.
    """
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='legal_analyzer_db', # The database you created earlier
            user='root',
            password='1234' # Replace with your actual MySQL Workbench password
        )
        if connection.is_connected():
            print("Successfully connected to MySQL database")
            return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def close_db_connection(connection):
    if connection and connection.is_connected():
        connection.close()
        print("MySQL connection is closed")