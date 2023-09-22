"use client"

import { useState, useEffect } from "react";
import { ipcRenderer } from "electron";



export default function CurrencyPage (){

    //----------------------STATE DECLARATION---------------------------
    const [currencies, setCurrencies] = useState();
    const [formValues, setFormValues] = useState();


    //----------------------API CALLS-----------------------------
  

    const getCurrencies = async () => {
      try {
        const rows = await ipcRenderer.invoke('get-currencies'); // Send an IPC message to the main process
        setCurrencies(rows);
      } catch (err) {
        console.error(err);
      }
    }

    const addCurrency = async () => {
        try{
            const data = {name: formValues.name, value: formValues.value}

            await ipcRenderer.invoke('add-currencies', data);
            // Handle the response from the main process
            console.log('Currency added successfully');

            await getCurrencies();
            } 
         catch (error){
            console.log(error)
            console.error('Failed to add currency');
        }
    }

    //--------------------EVENT HANDLERS----------------

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormValues({ ...formValues, [name]: value });
      };

    const handleSubmit = async (e) =>{
        e.preventDefault();

        await addCurrency();
    }

    //----------------------EFFECTS--------------------------------
    useEffect(() =>{
        getCurrencies()
    }, [])

    return(
        <>
            <form>
                <label htmlFor="currencyName">Currency Name:</label>
                <input id="currencyName" type="text" name="name" onChange={handleInputChange}/>
                <label htmlFor="currencyvalue">Currency Value:</label>
                <input id="currencyValue" type="number" name="value" onChange={handleInputChange}/>
                <button type="submit" onClick={handleSubmit}>Send</button>
            </form>
            <table>
                <thead>
                    <tr>
                        <th>Currency</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    
                        {
                            currencies?.map((currency) => (
                                <tr key={currency.name}>
                                    <td>{currency.name}</td>
                                    <td>{currency.value}</td>
                                </tr>
                            ))
                        }
                    
                </tbody>
            </table>
        </>
    )
    
}

