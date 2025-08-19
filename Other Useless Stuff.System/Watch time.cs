using System.Collections;

using System.Collections.Generic;

using UnityEngine;

using UnityEngine.UIElements;

using UnityEngine.SceneManagement;

using UnityEngine.SocialPlatforms;

using ScorePublic;

using UnityEngine.UI;

using System.Runtime.InteropServices.ComTypes;

using System;

using CameraShakePublic;



public class TetrisBlock : MonoBehaviour

{

    private static float OKS;

    private static float contador;

    public float velocidade;

    public float timer;

    public bool podeRodar;

    public Vector3 rotationPoint;

    private float previousTime;

    public static float fallTime = 1.0f;

    public static int height = 22;

    public static int width = 10;

    private readonly static Transform[,] grid = new Transform[width, height];



    // Start is called before the first frame update

    void Start()

    {

        timer = velocidade; //variaveis criadas para fazer a movimentação lateral mais rapida



        if (ValidMove ())

        {

           

        }

        else

        {

            Debug.Log("GAME OVER");

            Destroy(gameObject);

            SceneManager.LoadScene("gameover");

        }



        

    }



    // Update is called once per frame

    void Update()

    {

        if (Input.GetKey(KeyCode.LeftArrow))

        {

            timer += Time.deltaTime;

            if (timer > velocidade)

            {

                transform.position += new Vector3(-1, 0, 0);

                timer = 0;

                if (ValidMove())

                {



                }

                else

                {

                    transform.position += new Vector3(1, 0, 0);

                }

            }





        }



        else if (Input.GetKey(KeyCode.RightArrow))

        {

            timer += Time.deltaTime;

            if (timer > velocidade)

            {

                transform.position += new Vector3(1, 0, 0);

                timer = 0;

                if (ValidMove())

                {



                }

                else

                {

                    transform.position += new Vector3(-1, 0, 0);

                }

            }





        }



        else if (Input.GetKeyDown(KeyCode.UpArrow))

        {

            if (podeRodar)

            {

                //rotate !

                transform.RotateAround(transform.TransformPoint(rotationPoint), new Vector3(0, 0, 1), 90);

                if (ValidMove())

                {



                }

                else

                {

                    transform.RotateAround(transform.TransformPoint(rotationPoint), new Vector3(0, 0, 1), -90);

                }

            }





        }



        if (Time.time - previousTime > (Input.GetKey(KeyCode.DownArrow) ? fallTime / 10 : fallTime))

        {

            transform.position += new Vector3(0, -1, 0); //metodo que faz o bloco descer

            if (ValidMove())

            {



            }

            else

            {

                transform.position += new Vector3(0, 1, 0);

                AddGrid();

                CheckForLines();

                



                this.enabled = false;

                FindObjectOfType<SpawnTetromino>().NewTetromino();



                

                Score.ScoreBlocks vetor = new Score.ScoreBlocks(30, 20, 2, 0);

                Score.CV += (int)fallTime;

                Debug.Log(Score.CV);

                //float CV = 1++;

                //fallTime = Score.CV;

                float CV = vetor.blocospreEnchidos * fallTime;

            }



            previousTime = Time.time;

        }



        



        //contador += Time.deltaTime;

        if (Score.CV > 50)

        {

            OKS = 0.9f;

            fallTime = OKS;

            

        }

        if (Score.CV > 100)

        {

            OKS = 0.8f;

            fallTime = OKS;



        }

        if (Score.CV > 200)

        {

            OKS = 0.7f;

            fallTime = OKS;



        }

        if (Score.CV > 280)

        {

            OKS = 0.6f;

            fallTime = OKS;



        }

        if (Score.CV > 340)

        {

            OKS = 0.5f;

            fallTime = OKS;



        }

        if (Score.CV > 420)

        {

            OKS = 0.4f;

            fallTime = OKS;



        }

        if (Score.CV > 520)

        {

            OKS = 0.4f;

            fallTime = OKS;



        }

        if (Score.CV > 800)

        {

            OKS = 0.3f;

            fallTime = OKS;



        }

        if (Score.CV > 900)

        {

            OKS = 0.2f;

            fallTime = OKS;



        }

        if (Score.CV > 1000)

        {

            OKS = 0.1f;

            fallTime = OKS;



        }





    }



    void CheckForLines()

    {

        for (int i = height -1; i >= 0; i--)

        {

            if(HasLine(i))

            {

                DeleteLine(i);

                RowDown(i);

                ScoreLinhaetectada();

            }

        }

    }



    bool HasLine(int i)

    {

        for(int j = 0; j < width; j++)

        {

            if (grid[j, i] == null)

                return false;

        }

        return true;

    }



    void DeleteLine(int i)

    {

        for (int j = 0; j < width; j++)

        {

            Destroy(grid[j, i].gameObject);

            grid[j, i] = null;

        }

       

    }



    void RowDown(int i)

    {

        for (int y = i; y < height; y++)

        {

            for (int j = 0; j < width; j++)

            {

                if(grid[j,y] != null)

                {

                    grid[j, y - 1] = grid[j, y];

                    grid[j, y] = null;

                    grid[j, y - 1].transform.position -= new Vector3(0, 1, 0);

                }

            }

        }

        

       Score.ScoreBlocks vetor = new Score.ScoreBlocks(15, 10, 5, 0);

       Score.CV += vetor.linhapreEnchida;

       Score.CV -= (int)fallTime;

        Debug.Log(Score.CV);

        //CV += 100;

        //float CV = vetor.linhapreEnchida * fallTime;



        //CameraShake.ShakeCamerastruct vetore = new CameraShake.ShakeCamerastruct((float)1, (float)0.7,(float) 1);

        CameraShake.shakeDuration = 1;

    }



    void AddGrid()

    {

        foreach (Transform children in transform)

        {

            int roundedX = Mathf.RoundToInt(children.transform.position.x);

            int roundedY = Mathf.RoundToInt(children.transform.position.y);



            grid[roundedX, roundedY] = children;



        }

    }



  

    public bool ValidMove()

    {

        foreach (Transform children in transform)

        {

            int roundedX = Mathf.RoundToInt(children.transform.position.x);

            int roundedY = Mathf.RoundToInt(children.transform.position.y);



            if (roundedX < 0 || roundedX >= width || roundedY < 0 || roundedY > height)

            {

                return false;

            }

            if (grid[roundedX, roundedY] != null)

                return false;

        }

        return true;

    }

    /*

    bool LineDetectaUmalinha(int i)

    {

        for (int j = 0; j < width; j++)

        {

            if (grid[10, i] == null)

                return false;

        }

        return true;

    }

    */



    void ScoreLinhaetectada()

    {

        int roundedY = Mathf.RoundToInt(transform.position.y);

        //for (int i = height - 19; i <= 1; i++)

        for (int j = 0; j < width; j++)

        {

            if (roundedY >= 5)

            {

                Score.ScoreBlocks vetor = new Score.ScoreBlocks(30, 20, 6, 1);

                //Score.CV += vetor.scoreData;

                Score.CV += vetor.scoreData * roundedY;

                Debug.Log(Score.CV);

                Debug.Log("poooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooor");

            }

        }

    }



}

using System.Collections;

using System.Collections.Generic;

using UnityEngine;

using UnityEngine.UIElements;

using UnityEngine.SceneManagement;

using UnityEngine.SocialPlatforms;

using ScorePublic;

using UnityEngine.UI;

using System.Runtime.InteropServices.ComTypes;

using System;

using CameraShakePublic;



public class TetrisBlock : MonoBehaviour

{

    private static float OKS;

    private static float contador;

    public float velocidade;

    public float timer;

    public bool podeRodar;

    public Vector3 rotationPoint;

    private float previousTime;

    public static float fallTime = 1.0f;

    public static int height = 22;

    public static int width = 10;

    private readonly static Transform[,] grid = new Transform[width, height];



    // Start is called before the first frame update

    void Start()

    {

        timer = velocidade; //variaveis criadas para fazer a movimentação lateral mais rapida



        if (ValidMove ())

        {

           

        }

        else

        {

            Debug.Log("GAME OVER");

            Destroy(gameObject);

            SceneManager.LoadScene("gameover");

        }



        

    }



    // Update is called once per frame

    void Update()

    {

        if (Input.GetKey(KeyCode.LeftArrow))

        {

            timer += Time.deltaTime;

            if (timer > velocidade)

            {

                transform.position += new Vector3(-1, 0, 0);

                timer = 0;

                if (ValidMove())

                {



                }

                else

                {

                    transform.position += new Vector3(1, 0, 0);

                }

            }





        }



        else if (Input.GetKey(KeyCode.RightArrow))

        {

            timer += Time.deltaTime;

            if (timer > velocidade)

            {

                transform.position += new Vector3(1, 0, 0);

                timer = 0;

                if (ValidMove())

                {



                }

                else

                {

                    transform.position += new Vector3(-1, 0, 0);

                }

            }





        }



        else if (Input.GetKeyDown(KeyCode.UpArrow))

        {

            if (podeRodar)

            {

                //rotate !

                transform.RotateAround(transform.TransformPoint(rotationPoint), new Vector3(0, 0, 1), 90);

                if (ValidMove())

                {



                }

                else

                {

                    transform.RotateAround(transform.TransformPoint(rotationPoint), new Vector3(0, 0, 1), -90);

                }

            }





        }



        if (Time.time - previousTime > (Input.GetKey(KeyCode.DownArrow) ? fallTime / 10 : fallTime))

        {

            transform.position += new Vector3(0, -1, 0); //metodo que faz o bloco descer

            if (ValidMove())

            {



            }

            else

            {

                transform.position += new Vector3(0, 1, 0);

                AddGrid();

                CheckForLines();

                



                this.enabled = false;

                FindObjectOfType<SpawnTetromino>().NewTetromino();



                

                Score.ScoreBlocks vetor = new Score.ScoreBlocks(30, 20, 2, 0);

                Score.CV += (int)fallTime;

                Debug.Log(Score.CV);

                //float CV = 1++;

                //fallTime = Score.CV;

                float CV = vetor.blocospreEnchidos * fallTime;

            }



            previousTime = Time.time;

        }



        



        //contador += Time.deltaTime;

        if (Score.CV > 50)

        {

            OKS = 0.9f;

            fallTime = OKS;

            

        }

        if (Score.CV > 100)

        {

            OKS = 0.8f;

            fallTime = OKS;



        }

        if (Score.CV > 200)

        {

            OKS = 0.7f;

            fallTime = OKS;



        }

        if (Score.CV > 280)

        {

            OKS = 0.6f;

            fallTime = OKS;



        }

        if (Score.CV > 340)

        {

            OKS = 0.5f;

            fallTime = OKS;



        }

        if (Score.CV > 420)

        {

            OKS = 0.4f;

            fallTime = OKS;



        }

        if (Score.CV > 520)

        {

            OKS = 0.4f;

            fallTime = OKS;



        }

        if (Score.CV > 800)

        {

            OKS = 0.3f;

            fallTime = OKS;



        }

        if (Score.CV > 900)

        {

            OKS = 0.2f;

            fallTime = OKS;



        }

        if (Score.CV > 1000)

        {

            OKS = 0.1f;

            fallTime = OKS;



        }





    }



    void CheckForLines()

    {

        for (int i = height -1; i >= 0; i--)

        {

            if(HasLine(i))

            {

                DeleteLine(i);

                RowDown(i);

                ScoreLinhaetectada();

            }

        }

    }



    bool HasLine(int i)

    {

        for(int j = 0; j < width; j++)

        {

            if (grid[j, i] == null)

                return false;

        }

        return true;

    }



    void DeleteLine(int i)

    {

        for (int j = 0; j < width; j++)

        {

            Destroy(grid[j, i].gameObject);

            grid[j, i] = null;

        }

       

    }



    void RowDown(int i)

    {

        for (int y = i; y < height; y++)

        {

            for (int j = 0; j < width; j++)

            {

                if(grid[j,y] != null)

                {

                    grid[j, y - 1] = grid[j, y];

                    grid[j, y] = null;

                    grid[j, y - 1].transform.position -= new Vector3(0, 1, 0);

                }

            }

        }

        

       Score.ScoreBlocks vetor = new Score.ScoreBlocks(15, 10, 5, 0);

       Score.CV += vetor.linhapreEnchida;

       Score.CV -= (int)fallTime;

        Debug.Log(Score.CV);

        //CV += 100;

        //float CV = vetor.linhapreEnchida * fallTime;



        //CameraShake.ShakeCamerastruct vetore = new CameraShake.ShakeCamerastruct((float)1, (float)0.7,(float) 1);

        CameraShake.shakeDuration = 1;

    }



    void AddGrid()

    {

        foreach (Transform children in transform)

        {

            int roundedX = Mathf.RoundToInt(children.transform.position.x);

            int roundedY = Mathf.RoundToInt(children.transform.position.y);



            grid[roundedX, roundedY] = children;



        }

    }



  

    public bool ValidMove()

    {

        foreach (Transform children in transform)

        {

            int roundedX = Mathf.RoundToInt(children.transform.position.x);

            int roundedY = Mathf.RoundToInt(children.transform.position.y);



            if (roundedX < 0 || roundedX >= width || roundedY < 0 || roundedY > height)

            {

                return false;

            }

            if (grid[roundedX, roundedY] != null)

                return false;

        }

        return true;

    }

    /*

    bool LineDetectaUmalinha(int i)

    {

        for (int j = 0; j < width; j++)

        {

            if (grid[10, i] == null)

                return false;

        }

        return true;

    }

    */



    void ScoreLinhaetectada()

    {

        int roundedY = Mathf.RoundToInt(transform.position.y);

        //for (int i = height - 19; i <= 1; i++)

        for (int j = 0; j < width; j++)

        {

            if (roundedY >= 5)

            {

                Score.ScoreBlocks vetor = new Score.ScoreBlocks(30, 20, 6, 1);

                //Score.CV += vetor.scoreData;

                Score.CV += vetor.scoreData * roundedY;

                Debug.Log(Score.CV);

                Debug.Log("poooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooor");

            }

        }

    }



}
